package profile

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) GetProfileProgress(ctx context.Context, req *v1.GetProfileProgressRequest) (*v1.ProfileProgressResponse, error) {
	userID, err := apihelpers.ParseUUID(req.GetUserId(), "INVALID_USER_ID", "user_id")
	if err != nil {
		return nil, fmt.Errorf("parse user_id: %w", err)
	}
	progress, err := i.progressRepo.GetProfileProgress(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get profile progress: %w", err)
	}
	return &v1.ProfileProgressResponse{Progress: mapProfileProgress(progress)}, nil
}
