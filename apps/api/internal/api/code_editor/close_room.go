package code_editor

import (
	"context"

	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) CloseRoom(ctx context.Context, req *v1.CloseRoomRequest) (*v1.StatusResponse, error) {
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}

	callerID, _, _ := resolveActor(ctx, "")
	if err := i.service.CloseRoom(ctx, roomID, callerID); err != nil {
		return nil, mapErr(err)
	}

	if room, getErr := i.service.GetRoom(ctx, roomID); getErr == nil {
		i.realtime.PublishRoomUpdate(mapRealtimeRoom(room))
	}

	return &v1.StatusResponse{Status: "ok"}, nil
}
