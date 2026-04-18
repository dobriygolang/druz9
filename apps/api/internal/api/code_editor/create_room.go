package code_editor

import (
	"context"

	"api/internal/metrics"
	v1 "api/pkg/api/code_editor/v1"
)

func (i *Implementation) CreateRoom(ctx context.Context, req *v1.CreateRoomRequest) (*v1.CreateRoomResponse, error) {
	userID, name, isGuest := resolveActor(ctx, req.GetName())

	mode := protoRoomModeToModel(req.GetMode())
	difficulty := protoDifficultyToModel(req.GetDifficulty())
	room, err := i.service.CreateRoom(ctx, userID, name, isGuest, mode.String(), req.GetTopic(), difficulty.String(), req.GetTask(), req.GetIsPrivate())
	if err != nil {
		return nil, mapErr(err)
	}

	metrics.IncRoomsCreated()

	return &v1.CreateRoomResponse{
		Room:       mapRoom(room),
		InviteCode: room.InviteCode,
	}, nil
}
