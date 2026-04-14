package realtime

import (
	"context"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

const snapshotFlushInterval = 3 * time.Second

type pendingRoomSnapshot struct {
	roomID   string
	code     string
	language string
}

type pendingActorSnapshot struct {
	roomID    string
	userID    *string
	guestName string
	code      string
	language  string
}

func (h *CodeEditorHub) loadRoomSnapshot(roomID string) {
	parsedRoomID := mustParseUUID(roomID)
	if parsedRoomID == uuid.Nil {
		return
	}

	room, err := h.store.GetRoom(context.Background(), parsedRoomID)
	if err != nil || room == nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	state := h.rooms[roomID]
	if state == nil {
		return
	}
	state.mode = room.Mode.String()
	state.lastPlainText = room.Code
	state.defaultCode = room.Code
	state.language = room.Language.String()
	state.creatorID = room.CreatorID.String()
}

func (h *CodeEditorHub) snapshotLoop() {
	ticker := time.NewTicker(snapshotFlushInterval)
	defer ticker.Stop()

	for range ticker.C {
		var sharedPending []pendingRoomSnapshot
		var duelPending []pendingActorSnapshot

		h.mu.Lock()
		for roomID, room := range h.rooms {
			if room.mode == model.RoomModeDuel.String() {
				for client := range room.clients {
					state := room.duelStates[client.actorKey]
					if state == nil || !state.dirty {
						continue
					}
					var rawUserID *string
					if client.userID != "" {
						value := client.userID
						rawUserID = &value
					}
					duelPending = append(duelPending, pendingActorSnapshot{
						roomID:    roomID,
						userID:    rawUserID,
						guestName: client.guestName,
						code:      state.plainText,
						language:  state.language,
					})
					state.dirty = false
				}
				continue
			}
			if !room.dirty {
				continue
			}
			sharedPending = append(sharedPending, pendingRoomSnapshot{
				roomID:   roomID,
				code:     room.lastPlainText,
				language: room.language,
			})
			room.dirty = false
		}
		h.mu.Unlock()

		for _, item := range sharedPending {
			h.flushSnapshot(item.roomID, item.code, item.language)
		}
		for _, item := range duelPending {
			h.flushActorSnapshotByState(item)
		}
	}
}

func (h *CodeEditorHub) flushSnapshot(roomID, code, language string) {
	parsedRoomID := mustParseUUID(roomID)
	if parsedRoomID == uuid.Nil {
		return
	}
	_ = h.store.SaveEditorState(
		context.Background(),
		parsedRoomID,
		nil,
		"",
		code,
		model.ProgrammingLanguageFromString(language),
	)
}

func (h *CodeEditorHub) flushActorSnapshot(client *codeEditorClient, state *codeEditorEditorState) {
	if client == nil || state == nil {
		return
	}
	h.flushActorSnapshotByState(pendingActorSnapshot{
		roomID:    client.roomID,
		guestName: client.guestName,
		code:      state.plainText,
		language:  state.language,
		userID: func() *string {
			if client.userID == "" {
				return nil
			}
			value := client.userID
			return &value
		}(),
	})
}

func (h *CodeEditorHub) flushActorSnapshotByState(item pendingActorSnapshot) {
	parsedRoomID := mustParseUUID(item.roomID)
	if parsedRoomID == uuid.Nil {
		return
	}
	_ = h.store.SaveEditorState(
		context.Background(),
		parsedRoomID,
		parseOptionalUUID(derefString(item.userID)),
		item.guestName,
		item.code,
		model.ProgrammingLanguageFromString(item.language),
	)
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
