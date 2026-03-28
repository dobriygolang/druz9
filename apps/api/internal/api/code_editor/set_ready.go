package code_editor

import (
	"context"

	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) SetReady(ctx context.Context, req *v1.SetReadyRequest) (*v1.SetReadyResponse, error) {
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}

	userID, guestName, _ := resolveActor(ctx, "")
	err = i.service.SetReady(ctx, roomID, userID, guestName, req.Ready)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	if room, getErr := i.service.GetRoom(ctx, roomID); getErr == nil {
		i.realtime.PublishRoomUpdate(mapRealtimeRoom(room))
	}

	return &v1.SetReadyResponse{
		Status: "ok",
	}, nil
}
