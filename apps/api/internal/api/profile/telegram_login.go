package profile

import (
	"context"

	"api/internal/metrics"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) TelegramAuth(ctx context.Context, req *v1.TelegramAuthRequest) (*v1.ProfileResponse, error) {
	response, rawToken, expiresAt, err := i.service.TelegramAuth(ctx, req.Token, req.Code)
	if err != nil {
		return nil, err
	}

	i.cookie.SetSessionCookie(ctx, rawToken, expiresAt)
	if response.NeedsProfileComplete {
		metrics.IncUsers()
	}

	return mapProfileResponse(response), nil
}
