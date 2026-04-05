package code_editor

import (
	"context"

	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) GetRoom(ctx context.Context, req *v1.GetRoomRequest) (*v1.GetRoomResponse, error) {
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}

	room, err := i.service.GetRoom(ctx, roomID)
	if err != nil {
		return nil, mapErr(err)
	}

	return &v1.GetRoomResponse{Room: mapRoom(room)}, nil
}
