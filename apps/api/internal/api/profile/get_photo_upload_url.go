package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) GetPhotoUploadURL(ctx context.Context, req *v1.GetPhotoUploadURLRequest) (*v1.GetPhotoUploadURLResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	target, err := i.service.PreparePhotoUpload(ctx, user.ID.String(), req.FileName, req.ContentType)
	if err != nil {
		return nil, err
	}
	return &v1.GetPhotoUploadURLResponse{
		UploadUrl:        target.UploadURL,
		ObjectKey:        target.ObjectKey,
		ExpiresInSeconds: 900,
	}, nil
}
