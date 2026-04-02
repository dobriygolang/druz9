package profile

import (
	"context"

	"api/internal/metrics"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) YandexAuth(ctx context.Context, req *v1.YandexAuthRequest) (*v1.ProfileResponse, error) {
	response, rawToken, expiresAt, err := i.service.YandexAuth(ctx, req.State, req.Code)
	if err != nil {
		return nil, err
	}

	i.cookie.SetSessionCookie(ctx, rawToken, expiresAt)
	if response.NeedsProfileComplete {
		metrics.IncUsers()
	}

	return mapProfileResponse(response), nil
}
