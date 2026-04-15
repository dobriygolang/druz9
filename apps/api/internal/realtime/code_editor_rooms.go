package realtime

import (
	schema "api/internal/realtime/schema"
	"encoding/json"
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
	var pendingCode string
	var pendingFlush bool

	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room != nil {
		if room.dirty {
			pendingCode = room.lastPlainText
			pendingFlush = true
			room.dirty = false
		}
		delete(room.clients, client)
		if len(room.clients) == 0 {
			delete(h.rooms, client.roomID)
		}
	}
	var offlineAwareness *schema.CodeEditorMessage
	if room != nil && client.awarenessID != 0 {
		if current := room.awarenessByID[client.awarenessID]; current.Data != "" {
			var payload map[string]any
			if err := json.Unmarshal([]byte(current.Data), &payload); err == nil {
				payload["active"] = false
				if raw, err := json.Marshal(payload); err == nil {
					current.Data = string(raw)
					room.awarenessByID[client.awarenessID] = current
					offlineAwareness = &current
				}
			}
		}
	}
	h.mu.Unlock()

	if pendingFlush {
		h.flushSnapshot(client.roomID, pendingCode)
	}

	close(client.send)
	_ = client.ws.Close()

	if offlineAwareness != nil {
		h.broadcast(client.roomID, *offlineAwareness, client)
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
