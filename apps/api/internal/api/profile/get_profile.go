package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) GetProfile(ctx context.Context, _ *v1.GetProfileRequest) (*v1.ProfileResponse, error) {
	userFromCtx, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	// Get fresh user from DB to get actual AvatarURL
	resp, err := i.service.GetProfileByID(ctx, userFromCtx.ID)
	if err != nil {
		return nil, err
	}
	user := resp.User

	// Generate presigned URL for avatar
	avatarURL, err := i.service.GetAvatarURL(ctx, user.AvatarURL)
	if err != nil {
		return nil, err
	}
	user.AvatarURL = avatarURL

	return mapProfileResponse(&model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: user.Status == model.UserStatusPendingProfile,
	}), nil
}
