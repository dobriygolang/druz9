package code_editor

import (
	"context"

	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) JoinRoom(ctx context.Context, req *v1.JoinRoomRequest) (*v1.JoinRoomResponse, error) {
	roomID, err := uuid.Parse(req.RoomId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_ROOM_ID", "invalid room id")
	}

	userID, name, isGuest := resolveActor(ctx, req.Name)

	room, err := i.service.JoinRoom(ctx, roomID, userID, name, isGuest)
	if err != nil {
		if errors.Is(err, codeeditordomain.ErrRoomNotFound) {
			return nil, errors.NotFound("ROOM_NOT_FOUND", "room not found")
		}
		if errors.Is(err, codeeditordomain.ErrRoomFull) {
			return nil, errors.BadRequest("ROOM_FULL", "room is full")
		}
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	i.realtime.PublishRoomUpdate(mapRealtimeRoom(room))

	return &v1.JoinRoomResponse{
		Room: mapRoom(room),
	}, nil
}
