package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) GetProfile(ctx context.Context, _ *v1.GetProfileRequest) (*v1.ProfileResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	return mapProfileResponse(&model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: user.Status == model.UserStatusPendingProfile,
	}), nil
}
