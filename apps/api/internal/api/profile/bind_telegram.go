package profile

import (
	"context"

	"api/internal/model"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) BindTelegram(ctx context.Context, req *v1.BindTelegramRequest) (*v1.ProfileStatusResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	_, err := i.service.BindTelegram(ctx, user.ID, req.Token, req.Code)
	if err != nil {
		return nil, err
	}

	return &v1.ProfileStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
