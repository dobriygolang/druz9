package profile

import (
	"context"
	"fmt"

	"api/internal/metrics"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) TelegramAuth(ctx context.Context, req *v1.TelegramAuthRequest) (*v1.ProfileResponse, error) {
	response, rawToken, expiresAt, telegramID, err := i.service.TelegramAuth(ctx, req.GetToken(), req.GetCode())
	if err != nil {
		return nil, fmt.Errorf("telegram auth: %w", err)
	}

	if i.notif != nil && response != nil && response.User != nil && telegramID != 0 {
		i.notif.LinkTelegram(ctx, response.User.ID.String(), telegramID)
	}

	i.cookie.SetSessionCookie(ctx, rawToken, expiresAt)
	if response.NeedsProfileComplete {
		metrics.IncUsers()
	}

	return mapProfileResponse(response), nil
}
