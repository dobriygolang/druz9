package codeeditor

import (
	"encoding/json"
	"strings"

	"github.com/google/uuid"

	"api/internal/model"
	schema "api/internal/realtime/schema"
)

func (h *Hub) addClient(client *codeEditorClient) {
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
	clearAwarenessEntriesForActor(room, client, 0)
	room.clients[client] = struct{}{}
	shouldInitialize := !room.initializedFrom
	room.initializedFrom = true
	h.mu.Unlock()

	if shouldInitialize {
		h.loadRoomSnapshot(client.roomID)
	}
}

func (h *Hub) removeClient(client *codeEditorClient) {
	if client == nil {
		return
	}

	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room != nil {
		if room.mode == model.RoomModeDuel.String() {
			if state := room.duelStates[client.actorKey]; state != nil && state.dirty {
				h.flushActorSnapshot(client, state)
				state.dirty = false
			}
		} else if room.dirty {
			h.flushSnapshot(client.roomID, room.lastPlainText, room.language)
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
					offlineAwareness = &current
				}
			}
		}
		delete(room.awarenessByID, client.awarenessID)
	}
	h.mu.Unlock()

	client.closeOnce.Do(func() {
		close(client.send)
		_ = client.ws.Close()
	})

	if offlineAwareness != nil {
		h.broadcast(client.roomID, *offlineAwareness, client)
	}
}

func (h *Hub) sendSnapshot(client *codeEditorClient) {
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
				Type:              schema.CodeEditorTypeSnapshot,
				PlainText:         state.plainText,
				Language:          state.language,
				ActiveClientCount: len(room.clients),
			}
			h.mu.Unlock()
			if !client.enqueue(msg) {
				h.removeClient(client)
			}
			return
		}
		h.mu.Unlock()

		editorState, err := h.store.GetEditorState(h.ctx, mustParseUUID(client.roomID), parseOptionalUUID(client.userID), client.guestName)
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
			Type:              schema.CodeEditorTypeSnapshot,
			PlainText:         state.plainText,
			Language:          state.language,
			ActiveClientCount: len(room.clients),
		}
		h.mu.Unlock()
		if !client.enqueue(msg) {
			h.removeClient(client)
		}
		return
	}

	msg := schema.CodeEditorMessage{
		Type:              schema.CodeEditorTypeSnapshot,
		PlainText:         room.lastPlainText,
		Language:          room.language,
		ActiveClientCount: len(room.clients),
	}
	h.mu.Unlock()
	if !client.enqueue(msg) {
		h.removeClient(client)
	}
}

func (h *Hub) sendAwarenessSnapshot(client *codeEditorClient) {
	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room == nil || room.mode == model.RoomModeDuel.String() {
		h.mu.Unlock()
		return
	}

	messages := make([]schema.CodeEditorMessage, 0, len(room.awarenessByID))
	for awarenessID, msg := range room.awarenessByID {
		if awarenessID == client.awarenessID {
			continue
		}
		messages = append(messages, msg)
	}
	h.mu.Unlock()

	for _, msg := range messages {
		if !client.enqueue(msg) {
			h.removeClient(client)
			return
		}
	}
}

func (h *Hub) handleUpdate(client *codeEditorClient, msg schema.CodeEditorMessage) {
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
		codeLen := len([]rune(msg.PlainText))
		senderUserID := client.userID
		h.mu.Unlock()

		// Broadcast code-length progress to the opponent(s) without revealing the code.
		h.broadcast(client.roomID, schema.CodeEditorMessage{
			Type:    schema.CodeEditorTypeDuelProgress,
			UserID:  senderUserID,
			CodeLen: codeLen,
		}, client)
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

func (h *Hub) handlePersist(client *codeEditorClient, msg schema.CodeEditorMessage) {
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

func (h *Hub) handleLanguageChange(client *codeEditorClient, msg schema.CodeEditorMessage) {
	parsedRoomID := mustParseUUID(client.roomID)
	if parsedRoomID == uuid.Nil {
		return
	}

	language := model.ProgrammingLanguageFromString(msg.Language)
	if language == model.ProgrammingLanguageUnknown {
		return
	}

	editorState, err := h.store.SetEditorLanguage(h.ctx, parsedRoomID, parseOptionalUUID(client.userID), client.guestName, language)
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
		if !client.enqueue(schema.CodeEditorMessage{
			Type:      schema.CodeEditorTypeSnapshot,
			PlainText: state.plainText,
			Language:  state.language,
		}) {
			h.removeClient(client)
		}
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

func (h *Hub) handleAwareness(client *codeEditorClient, msg schema.CodeEditorMessage) {
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
		clearAwarenessEntriesForActor(room, client, client.awarenessID)
		room.awarenessByID[client.awarenessID] = msg
	}
	h.mu.Unlock()

	h.broadcast(client.roomID, msg, client)
}

func clearAwarenessEntriesForActor(room *codeEditorRoom, client *codeEditorClient, keepAwarenessID uint64) {
	if room == nil || client == nil {
		return
	}

	actorID := strings.TrimSpace(client.userID)
	if actorID == "" {
		actorID = strings.TrimSpace(client.guestName)
	}
	if actorID == "" {
		return
	}

	for awarenessID, msg := range room.awarenessByID {
		if awarenessID == keepAwarenessID {
			continue
		}
		if strings.TrimSpace(msg.UserID) == actorID {
			delete(room.awarenessByID, awarenessID)
		}
	}
}

func (h *Hub) broadcast(roomID string, msg schema.CodeEditorMessage, sender *codeEditorClient) {
	h.mu.Lock()
	room := h.rooms[roomID]
	if room == nil {
		h.mu.Unlock()
		return
	}

	targets := make([]*codeEditorClient, 0, len(room.clients))
	for client := range room.clients {
		if sender != nil && client == sender {
			continue
		}
		targets = append(targets, client)
	}
	h.mu.Unlock()

	for _, client := range targets {
		if !client.enqueue(msg) {
			h.removeClient(client)
		}
	}
}

func (h *Hub) PublishRoomUpdate(room *schema.CodeEditorRoom) {
	if room == nil || room.ID == "" {
		return
	}
	h.broadcast(room.ID, schema.CodeEditorMessage{
		Type: schema.CodeEditorTypeRoomUpdate,
		Room: room,
	}, nil)
}

func (h *Hub) PublishSubmission(roomID string, submission *schema.CodeEditorSubmissionEvent) {
	if roomID == "" || submission == nil {
		return
	}
	h.broadcast(roomID, schema.CodeEditorMessage{
		Type:       schema.CodeEditorTypeSubmission,
		Submission: submission,
	}, nil)
}

// PublishReviewReady sends a review_ready event to all rooms where the user is connected.
func (h *Hub) PublishReviewReady(userID string, review *schema.CodeEditorReviewEvent) {
	if userID == "" || review == nil {
		return
	}

	msg := schema.CodeEditorMessage{
		Type:   schema.CodeEditorTypeReviewReady,
		Review: review,
	}

	h.mu.Lock()
	var targets []*codeEditorClient
	for _, room := range h.rooms {
		for client := range room.clients {
			if client.authenticatedUserID == userID {
				targets = append(targets, client)
			}
		}
	}
	h.mu.Unlock()

	for _, client := range targets {
		if !client.enqueue(msg) {
			h.removeClient(client)
		}
	}
}
