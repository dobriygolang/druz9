package mission

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/model"
	v1 "api/pkg/api/mission/v1"
)

func (i *Implementation) CompleteMission(ctx context.Context, req *v1.CompleteMissionRequest) (*v1.CompleteMissionResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok || user == nil {
		return nil, errors.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	if req.GetMissionKey() == "" {
		return nil, errors.BadRequest("INVALID_MISSION_KEY", "mission_key is required")
	}

	if err := i.service.CompleteMission(ctx, user.ID, req.GetMissionKey()); err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to complete mission")
	}

	return &v1.CompleteMissionResponse{Ok: true}, nil
}
