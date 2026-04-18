package profile

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/model"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) BindTelegram(ctx context.Context, req *v1.BindTelegramRequest) (*v1.ProfileStatusResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	_, telegramID, err := i.service.BindTelegram(ctx, user.ID, req.GetToken(), req.GetCode())
	if err != nil {
		return nil, err
	}
	if i.notif != nil && telegramID != 0 {
		i.notif.LinkTelegram(ctx, user.ID.String(), telegramID)
	}

	return &v1.ProfileStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
