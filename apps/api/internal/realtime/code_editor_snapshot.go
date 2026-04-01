package realtime

import (
	"context"
	"time"

	"github.com/google/uuid"
)

const snapshotFlushInterval = 3 * time.Second

func (h *CodeEditorHub) loadRoomSnapshot(roomID string) {
	parsedRoomID, err := uuid.Parse(roomID)
	if err != nil {
		return
	}

	room, err := h.store.GetRoom(context.Background(), parsedRoomID)
	if err != nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	state := h.rooms[roomID]
	if state == nil {
		return
	}
	state.lastPlainText = room.Code
	state.creatorID = room.CreatorID.String()
}

func (h *CodeEditorHub) snapshotLoop() {
	ticker := time.NewTicker(snapshotFlushInterval)
	defer ticker.Stop()

	for range ticker.C {
		type snapshot struct {
			roomID string
			code   string
		}

		var pending []snapshot

		h.mu.Lock()
		for roomID, room := range h.rooms {
			if !room.dirty {
				continue
			}
			pending = append(pending, snapshot{roomID: roomID, code: room.lastPlainText})
			room.dirty = false
		}
		h.mu.Unlock()

		for _, item := range pending {
			h.flushSnapshot(item.roomID, item.code)
		}
	}
}

func (h *CodeEditorHub) flushSnapshot(roomID, code string) {
	parsedRoomID, err := uuid.Parse(roomID)
	if err != nil {
		return
	}
	_ = h.store.SaveCodeSnapshot(context.Background(), parsedRoomID, code)
}
