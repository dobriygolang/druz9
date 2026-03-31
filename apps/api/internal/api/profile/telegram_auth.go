package profile

import (
	"context"

	"api/internal/metrics"
	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) CreateTelegramAuthChallenge(ctx context.Context, _ *v1.CreateTelegramAuthChallengeRequest) (*v1.CreateTelegramAuthChallengeResponse, error) {
	challenge, err := i.service.CreateTelegramAuthChallenge(ctx)
	if err != nil {
		return nil, err
	}

	return &v1.CreateTelegramAuthChallengeResponse{
		Token:       challenge.Token,
		BotStartUrl: challenge.BotStartURL,
		ExpiresAt:   timestamppb.New(challenge.ExpiresAt),
	}, nil
}

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

func (i *Implementation) TelegramAuth(ctx context.Context, req *v1.TelegramAuthRequest) (*v1.ProfileResponse, error) {
	response, rawToken, expiresAt, err := i.service.TelegramAuth(ctx, req.Token, req.Code)
	if err != nil {
		return nil, err
	}

	i.cookie.SetSessionCookie(ctx, rawToken, expiresAt)

	// Track new user registration (NeedsProfileComplete is true for new users)
	if response.NeedsProfileComplete {
		metrics.IncUsers()
	}

	return mapProfileResponse(response), nil
}
