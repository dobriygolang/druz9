package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) BindTelegram(ctx context.Context, req *v1.BindTelegramRequest) (*v1.BindTelegramResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	_, err := i.service.BindTelegram(ctx, user.ID, req.Token, req.Code)
	if err != nil {
		return nil, err
	}

	return &v1.BindTelegramResponse{Status: "ok"}, nil
}