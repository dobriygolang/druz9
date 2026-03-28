package code_editor

import (
	"context"

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

	room, err := i.service.GetRoom(ctx, roomID)
	if err != nil {
		if errors.Is(err, codeeditordomain.ErrRoomNotFound) {
			return nil, errors.NotFound("ROOM_NOT_FOUND", "room not found")
		}
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	return &v1.GetRoomResponse{
		Room: mapRoom(room),
	}, nil
}
