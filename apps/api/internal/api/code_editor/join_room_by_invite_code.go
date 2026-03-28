package code_editor

import (
	"context"

	codeeditordomain "api/internal/domain/codeeditor"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) JoinRoomByInviteCode(ctx context.Context, req *v1.JoinRoomByInviteCodeRequest) (*v1.JoinRoomResponse, error) {
	userID, name, isGuest := resolveActor(ctx, req.Name)

	room, err := i.service.JoinRoomByInviteCode(ctx, req.InviteCode, userID, name, isGuest)
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
