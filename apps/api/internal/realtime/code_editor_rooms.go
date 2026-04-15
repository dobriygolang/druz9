package realtime

import (
	"context"
	"encoding/json"

	"api/internal/model"
	schema "api/internal/realtime/schema"

	"github.com/google/uuid"
)

func (h *CodeEditorHub) addClient(client *codeEditorClient) {
	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room == nil {
		room = &codeEditorRoom{
			clients:       make(map[*codeEditorClient]struct{}),
			awarenessByID: make(map[uint64]schema.CodeEditorMessage),
			duelStates:    make(map[string]*codeEditorEditorState),
			mode:          client.roomMode,
		}
		h.rooms[client.roomID] = room
	}
	if room.mode == "" {
		room.mode = client.roomMode
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
	var pendingLanguage string
	var pendingFlush bool
	var pendingActor *pendingActorSnapshot

	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room != nil {
		if room.mode == model.RoomModeDuel.String() {
			if state := room.duelStates[client.actorKey]; state != nil && state.dirty {
				var rawUserID *string
				if client.userID != "" {
					value := client.userID
					rawUserID = &value
				}
				pendingActor = &pendingActorSnapshot{
					roomID:    client.roomID,
					userID:    rawUserID,
					guestName: client.guestName,
					code:      state.plainText,
					language:  state.language,
				}
				state.dirty = false
			}
		} else if room.dirty {
			pendingCode = room.lastPlainText
			pendingLanguage = room.language
			pendingFlush = true
			room.dirty = false
		}
		delete(room.clients, client)
		if len(room.clients) == 0 {
			delete(h.rooms, client.roomID)
		}
	}
	var offlineAwareness *schema.CodeEditorMessage
	if room != nil && room.mode != model.RoomModeDuel.String() && client.awarenessID != 0 {
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
		h.flushSnapshot(client.roomID, pendingCode, pendingLanguage)
	}
	if pendingActor != nil {
		h.flushActorSnapshotByState(*pendingActor)
	}

	close(client.send)
	_ = client.ws.Close()

	if offlineAwareness != nil {
		h.broadcast(client.roomID, *offlineAwareness, client)
	}
}

func (h *CodeEditorHub) sendSnapshot(client *codeEditorClient) {
	if client == nil {
		return
	}

	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room == nil {
		h.mu.Unlock()
		return
	}

	if room.mode == model.RoomModeDuel.String() {
		state := room.duelStates[client.actorKey]
		if state != nil && state.initialized {
			msg := schema.CodeEditorMessage{
				Type:      schema.CodeEditorTypeSnapshot,
				PlainText: state.plainText,
				Language:  state.language,
			}
			h.mu.Unlock()
			client.enqueue(msg)
			return
		}
		h.mu.Unlock()

		editorState, err := h.store.GetEditorState(context.Background(), mustParseUUID(client.roomID), parseOptionalUUID(client.userID), client.guestName)
		if err != nil || editorState == nil {
			return
		}

		h.mu.Lock()
		room = h.rooms[client.roomID]
		if room == nil {
			h.mu.Unlock()
			return
		}
		state = room.duelStates[client.actorKey]
		if state == nil {
			state = &codeEditorEditorState{}
			room.duelStates[client.actorKey] = state
		}
		state.plainText = editorState.Code
		state.language = editorState.Language.String()
		state.initialized = true
		msg := schema.CodeEditorMessage{
			Type:      schema.CodeEditorTypeSnapshot,
			PlainText: state.plainText,
			Language:  state.language,
		}
		h.mu.Unlock()
		client.enqueue(msg)
		return
	}

	msg := schema.CodeEditorMessage{
		Type:      schema.CodeEditorTypeSnapshot,
		PlainText: room.lastPlainText,
		Language:  room.language,
	}
	h.mu.Unlock()
	client.enqueue(msg)
}

func (h *CodeEditorHub) sendAwarenessSnapshot(client *codeEditorClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.rooms[client.roomID]
	if room == nil || room.mode == model.RoomModeDuel.String() {
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
	if room == nil {
		h.mu.Unlock()
		return
	}

	if room.mode == model.RoomModeDuel.String() {
		state := room.duelStates[client.actorKey]
		if state == nil {
			state = &codeEditorEditorState{}
			room.duelStates[client.actorKey] = state
		}
		state.plainText = msg.PlainText
		if msg.Language != "" {
			state.language = msg.Language
		} else if state.language == "" {
			state.language = room.language
		}
		state.initialized = true
		state.dirty = true
		h.mu.Unlock()
		return
	}

	room.lastPlainText = msg.PlainText
	if msg.Language != "" {
		room.language = msg.Language
	}
	room.dirty = true
	h.mu.Unlock()

	h.broadcast(client.roomID, msg, client)
}

func (h *CodeEditorHub) handlePersist(client *codeEditorClient, msg schema.CodeEditorMessage) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.rooms[client.roomID]
	if room == nil {
		return
	}

	if room.mode == model.RoomModeDuel.String() {
		state := room.duelStates[client.actorKey]
		if state == nil {
			state = &codeEditorEditorState{}
			room.duelStates[client.actorKey] = state
		}
		state.plainText = msg.PlainText
		if msg.Language != "" {
			state.language = msg.Language
		} else if state.language == "" {
			state.language = room.language
		}
		state.initialized = true
		state.dirty = true
		return
	}

	room.lastPlainText = msg.PlainText
	if msg.Language != "" {
		room.language = msg.Language
	}
	room.dirty = true
}

func (h *CodeEditorHub) handleLanguageChange(client *codeEditorClient, msg schema.CodeEditorMessage) {
	parsedRoomID := mustParseUUID(client.roomID)
	if parsedRoomID == uuid.Nil {
		return
	}

	language := model.ProgrammingLanguageFromString(msg.Language)
	if language == model.ProgrammingLanguageUnknown {
		return
	}

	editorState, err := h.store.SetEditorLanguage(context.Background(), parsedRoomID, parseOptionalUUID(client.userID), client.guestName, language)
	if err != nil || editorState == nil {
		return
	}

	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room == nil {
		h.mu.Unlock()
		return
	}

	if room.mode == model.RoomModeDuel.String() {
		state := room.duelStates[client.actorKey]
		if state == nil {
			state = &codeEditorEditorState{}
			room.duelStates[client.actorKey] = state
		}
		state.plainText = editorState.Code
		state.language = editorState.Language.String()
		state.initialized = true
		state.dirty = false
		h.mu.Unlock()
		client.enqueue(schema.CodeEditorMessage{
			Type:      schema.CodeEditorTypeSnapshot,
			PlainText: state.plainText,
			Language:  state.language,
		})
		return
	}

	room.language = editorState.Language.String()
	room.lastPlainText = editorState.Code
	room.dirty = false
	h.mu.Unlock()

	h.broadcast(client.roomID, schema.CodeEditorMessage{
		Type:      schema.CodeEditorTypeLanguage,
		Language:  editorState.Language.String(),
		PlainText: editorState.Code,
	}, nil)
}

func (h *CodeEditorHub) handleAwareness(client *codeEditorClient, msg schema.CodeEditorMessage) {
	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room == nil || room.mode == model.RoomModeDuel.String() {
		h.mu.Unlock()
		return
	}
	if msg.AwarenessID != 0 {
		client.awarenessID = msg.AwarenessID
	}
	if client.awarenessID != 0 && msg.Data != "" {
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
