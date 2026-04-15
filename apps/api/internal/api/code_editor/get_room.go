package code_editor

import (
	"context"
	"strings"

	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) GetRoom(ctx context.Context, req *v1.GetRoomRequest) (*v1.GetRoomResponse, error) {
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}

	userID, guestName, _ := resolveActor(ctx, "")
	room, err := i.service.GetRoom(ctx, roomID)
	if err != nil {
		return nil, mapErr(err)
	}
	if !codeEditorRoomAccessibleByActor(room, userID, guestName) {
		return nil, mapErr(codeeditordomain.ErrRoomNotFound)
	}
	if actorService, ok := i.service.(interface {
		GetRoomForActor(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) (*codeeditordomain.Room, error)
	}); ok {
		room, err = actorService.GetRoomForActor(ctx, roomID, userID, guestName)
		if err != nil {
			return nil, mapErr(err)
		}
	}

	return &v1.GetRoomResponse{Room: mapRoom(room)}, nil
}

func codeEditorRoomAccessibleByActor(room *codeeditordomain.Room, userID *uuid.UUID, guestName string) bool {
	if room == nil {
		return false
	}

	if userID != nil {
		if room.CreatorID == *userID {
			return true
		}
		for _, participant := range room.Participants {
			if participant != nil && participant.UserID != nil && *participant.UserID == *userID {
				return true
			}
		}
		return false
	}

	guestName = strings.TrimSpace(guestName)
	if guestName == "" {
		return false
	}

	for _, participant := range room.Participants {
		if participant != nil && participant.IsGuest && strings.EqualFold(strings.TrimSpace(participant.Name), guestName) {
			return true
		}
	}
	return false
}
