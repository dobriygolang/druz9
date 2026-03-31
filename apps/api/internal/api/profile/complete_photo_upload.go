package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) CompletePhotoUpload(ctx context.Context, req *v1.CompletePhotoUploadRequest) (*v1.CompletePhotoUploadResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	objectKey := req.GetObjectKey()
	if objectKey == "" {
		return nil, errors.BadRequest("MISSING_OBJECT_KEY", "object_key is required")
	}

	response, err := i.service.CompletePhotoUpload(ctx, user.ID, objectKey)
	if err != nil {
		return nil, err
	}

	return &v1.CompletePhotoUploadResponse{
		User:                 mapUser(response.User),
		NeedsProfileComplete: response.NeedsProfileComplete,
	}, nil
}
