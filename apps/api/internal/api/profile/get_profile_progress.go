package profile

import (
	"context"

	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

// GetProfileProgress stub. Please implement it.
func (i *Implementation) GetProfileProgress(ctx context.Context, req *v1.GetProfileProgressRequest) (*v1.ProfileProgressResponse, error) {
	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user id")
	}
	progress, err := i.progressRepo.GetProfileProgress(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &v1.ProfileProgressResponse{Progress: mapProfileProgress(progress)}, nil
}
