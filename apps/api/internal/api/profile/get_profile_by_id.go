package profile

import (
	"context"

	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) GetProfileByID(ctx context.Context, req *v1.GetProfileByIDRequest) (*v1.ProfileResponse, error) {
	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user id")
	}

	response, err := i.service.GetProfileByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Generate presigned URL for avatar
	avatarURL, err := i.service.GetAvatarURL(ctx, response.User.AvatarURL)
	if err != nil {
		return nil, err
	}
	response.User.AvatarURL = avatarURL

	return mapProfileResponse(response), nil
}
