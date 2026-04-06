package code_editor

import (
	"context"

	"api/internal/metrics"
	v1 "api/pkg/api/code_editor/v1"
)

func (i *Implementation) CreateRoom(ctx context.Context, req *v1.CreateRoomRequest) (*v1.CreateRoomResponse, error) {
	userID, name, isGuest := resolveActor(ctx, req.Name)

	mode := protoRoomModeToModel(req.Mode)
	difficulty := protoDifficultyToModel(req.Difficulty)
	room, err := i.service.CreateRoom(ctx, userID, name, isGuest, mode.String(), req.Topic, difficulty.String(), req.Task)
	if err != nil {
		return nil, mapErr(err)
	}

	metrics.IncRoomsCreated()

	return &v1.CreateRoomResponse{
		Room:       mapRoom(room),
		InviteCode: room.InviteCode,
	}, nil
}
