package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) TelegramAuth(ctx context.Context, req *v1.TelegramAuthRequest) (*v1.ProfileResponse, error) {
	payload := model.TelegramAuthPayload{
		ID:        req.Id,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Username:  req.Username,
		PhotoURL:  req.PhotoUrl,
		AuthDate:  req.AuthDate,
		Hash:      req.Hash,
	}

	response, rawToken, expiresAt, err := i.service.TelegramAuth(ctx, payload)
	if err != nil {
		return nil, err
	}

	i.cookie.SetSessionCookie(ctx, rawToken, expiresAt)
	return mapProfileResponse(response), nil
}
