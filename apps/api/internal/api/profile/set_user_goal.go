package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

var validGoalKinds = map[string]bool{
	"general_growth": true,
	"weakest_first":  true,
	"company_prep":   true,
}

func (i *Implementation) SetUserGoal(ctx context.Context, req *v1.SetUserGoalRequest) (*v1.SetUserGoalResponse, error) {
	userFromCtx, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	kind := req.Kind
	if kind == "" {
		kind = "general_growth"
	}
	if !validGoalKinds[kind] {
		return nil, errors.BadRequest("INVALID_GOAL_KIND", "goal kind must be one of: general_growth, weakest_first, company_prep")
	}

	goal := &model.UserGoal{
		Kind:    kind,
		Company: req.Company,
	}

	if err := i.progressRepo.SaveUserGoal(ctx, userFromCtx.ID, goal); err != nil {
		return nil, err
	}

	return &v1.SetUserGoalResponse{
		Goal: &v1.UserGoal{
			Kind:    goal.Kind,
			Company: goal.Company,
		},
	}, nil
}
