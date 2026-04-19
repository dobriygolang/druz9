package profile

import (
	"context"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) UpdateProfile(ctx context.Context, req *v1.UpdateProfileRequest) (*v1.ProfileResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	resp, err := i.service.UpdateProfile(ctx, user.ID, req.GetCurrentWorkplace())
	if err != nil {
		return nil, fmt.Errorf("update profile: %w", err)
	}
	return mapProfileResponse(resp), nil
}
