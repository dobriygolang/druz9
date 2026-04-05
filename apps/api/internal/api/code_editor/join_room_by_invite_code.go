package code_editor

import (
	"context"

	v1 "api/pkg/api/code_editor/v1"
)

func (i *Implementation) JoinRoomByInviteCode(ctx context.Context, req *v1.JoinRoomByInviteCodeRequest) (*v1.JoinRoomResponse, error) {
	userID, name, isGuest := resolveActor(ctx, req.Name)

	room, err := i.service.JoinRoomByInviteCode(ctx, req.InviteCode, userID, name, isGuest)
	if err != nil {
		return nil, mapErr(err)
	}

	i.realtime.PublishRoomUpdate(mapRealtimeRoom(room))

	return &v1.JoinRoomResponse{Room: mapRoom(room)}, nil
}
