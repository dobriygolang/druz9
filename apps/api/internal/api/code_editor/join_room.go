package code_editor

import (
	"context"

	"api/internal/metrics"
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
		return nil, mapErr(err)
	}

	i.realtime.PublishRoomUpdate(mapRealtimeRoom(room))
	metrics.IncRoomsJoined()

	return &v1.JoinRoomResponse{Room: mapRoom(room)}, nil
}
