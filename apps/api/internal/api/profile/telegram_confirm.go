package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) ConfirmTelegramAuth(ctx context.Context, req *v1.ConfirmTelegramAuthRequest) (*v1.ConfirmTelegramAuthResponse, error) {
	code, err := i.service.ConfirmTelegramAuth(ctx, req.BotToken, req.Token, model.TelegramAuthPayload{
		ID:        req.TelegramId,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Username:  req.Username,
		PhotoURL:  req.PhotoUrl,
	})
	if err != nil {
		return nil, err
	}

	return &v1.ConfirmTelegramAuthResponse{Status: "ok", Code: code}, nil
}
