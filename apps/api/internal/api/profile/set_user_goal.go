package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) SetUserGoal(ctx context.Context, req *v1.SetUserGoalRequest) (*v1.SetUserGoalResponse, error) {
	userFromCtx, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	kind := goalKindOrDefault(req.Kind)

	goal := &model.UserGoal{
		Kind:    kind,
		Company: req.Company,
	}

	if err := i.progressRepo.SaveUserGoal(ctx, userFromCtx.ID, goal); err != nil {
		return nil, err
	}

	return &v1.SetUserGoalResponse{
		Goal: &v1.UserGoal{
			Kind:    mapUserGoalKind(goal.Kind),
			Company: goal.Company,
		},
	}, nil
}
