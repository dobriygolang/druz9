package profile

import (
	"context"

	"api/internal/apihelpers"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) GetProfileByID(ctx context.Context, req *v1.GetProfileByIDRequest) (*v1.ProfileResponse, error) {
	userID, err := apihelpers.ParseUUID(req.GetUserId(), "INVALID_USER_ID", "user_id")
	if err != nil {
		return nil, err
	}

	response, err := i.service.GetProfileByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return mapProfileResponse(response), nil
}
