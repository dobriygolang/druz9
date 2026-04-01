package realtime

import (
	schema "api/internal/realtime/schema"
)

func (h *CodeEditorHub) addClient(client *codeEditorClient) {
	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room == nil {
		room = &codeEditorRoom{
			clients:       make(map[*codeEditorClient]struct{}),
			awarenessByID: make(map[uint64]schema.CodeEditorMessage),
		}
		h.rooms[client.roomID] = room
	}
	room.clients[client] = struct{}{}
	shouldInitialize := !room.initializedFrom
	room.initializedFrom = true
	h.mu.Unlock()

	if shouldInitialize {
		h.loadRoomSnapshot(client.roomID)
	}
}

func (h *CodeEditorHub) removeClient(client *codeEditorClient) {
	h.mu.Lock()
	room := h.rooms[client.roomID]
	isCreator := room != nil && room.creatorID != "" && client.userID == room.creatorID
	if room != nil {
		if room.dirty {
			h.flushSnapshot(client.roomID, room.lastPlainText)
			room.dirty = false
		}
		delete(room.clients, client)
		if client.awarenessID != 0 {
			delete(room.awarenessByID, client.awarenessID)
		}
		if len(room.clients) == 0 {
			delete(h.rooms, client.roomID)
		}
	}
	h.mu.Unlock()

	close(client.send)
	_ = client.ws.Close()

	if client.awarenessID != 0 && !isCreator {
		h.broadcast(client.roomID, schema.CodeEditorMessage{
			Type:         schema.CodeEditorTypeAwarenessRemove,
			AwarenessIDs: []uint64{client.awarenessID},
		}, client)
	}
}

func (h *CodeEditorHub) sendSnapshot(client *codeEditorClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.rooms[client.roomID]
	if room == nil {
		return
	}

	client.enqueue(schema.CodeEditorMessage{
		Type:      schema.CodeEditorTypeSnapshot,
		PlainText: room.lastPlainText,
	})
}

func (h *CodeEditorHub) sendAwarenessSnapshot(client *codeEditorClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.rooms[client.roomID]
	if room == nil {
		return
	}

	for awarenessID, msg := range room.awarenessByID {
		if awarenessID == client.awarenessID {
			continue
		}
		client.enqueue(msg)
	}
}

func (h *CodeEditorHub) handleUpdate(client *codeEditorClient, msg schema.CodeEditorMessage) {
	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room != nil {
		room.lastPlainText = msg.PlainText
		room.dirty = true
	}
	h.mu.Unlock()

	h.broadcast(client.roomID, msg, client)
}

func (h *CodeEditorHub) handleAwareness(client *codeEditorClient, msg schema.CodeEditorMessage) {
	if msg.AwarenessID != 0 {
		client.awarenessID = msg.AwarenessID
	}

	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room != nil && client.awarenessID != 0 && msg.Data != "" {
		room.awarenessByID[client.awarenessID] = msg
	}
	h.mu.Unlock()

	h.broadcast(client.roomID, msg, client)
}

func (h *CodeEditorHub) broadcast(roomID string, msg schema.CodeEditorMessage, sender *codeEditorClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.rooms[roomID]
	if room == nil {
		return
	}

	for client := range room.clients {
		if sender != nil && client == sender {
			continue
		}
		client.enqueue(msg)
	}
}

func (h *CodeEditorHub) PublishRoomUpdate(room *schema.CodeEditorRoom) {
	if room == nil || room.ID == "" {
		return
	}
	h.broadcast(room.ID, schema.CodeEditorMessage{
		Type: schema.CodeEditorTypeRoomUpdate,
		Room: room,
	}, nil)
}

func (h *CodeEditorHub) PublishSubmission(roomID string, submission *schema.CodeEditorSubmissionEvent) {
	if roomID == "" || submission == nil {
		return
	}
	h.broadcast(roomID, schema.CodeEditorMessage{
		Type:       schema.CodeEditorTypeSubmission,
		Submission: submission,
	}, nil)
}
