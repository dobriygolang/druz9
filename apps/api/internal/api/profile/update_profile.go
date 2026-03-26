package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) UpdateProfile(ctx context.Context, req *v1.UpdateProfileRequest) (*v1.ProfileResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	resp, err := i.service.UpdateProfile(ctx, user.ID, req.CurrentWorkplace)
	if err != nil {
		return nil, err
	}
	return mapProfileResponse(resp), nil
}
