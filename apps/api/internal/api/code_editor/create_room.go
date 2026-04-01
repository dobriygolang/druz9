package code_editor

import (
	"context"

	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/metrics"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) CreateRoom(ctx context.Context, req *v1.CreateRoomRequest) (*v1.CreateRoomResponse, error) {
	userID, name, isGuest := resolveActor(ctx, req.Name)

	mode := protoRoomModeToModel(req.Mode)
	difficulty := protoDifficultyToModel(req.Difficulty)
	room, err := i.service.CreateRoom(ctx, userID, name, isGuest, mode.String(), req.Topic, difficulty.String())
	if err != nil {
		if errors.Is(err, codeeditordomain.ErrInvalidMode) {
			return nil, errors.BadRequest("INVALID_MODE", "invalid room mode")
		}
		if errors.Is(err, codeeditordomain.ErrNoAvailableTasks) {
			return nil, errors.BadRequest("NO_AVAILABLE_TASKS", "no available tasks for this duel topic")
		}
		return nil, errors.InternalServer("INTERNAL_ERROR", err.Error())
	}

	metrics.IncRoomsCreated()

	return &v1.CreateRoomResponse{
		Room:       mapRoom(room),
		InviteCode: room.InviteCode,
	}, nil
}
