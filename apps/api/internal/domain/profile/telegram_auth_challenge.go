package profile

import (
	"context"
	"strings"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"
)

// CreateTelegramAuthChallenge generates a one-time token for Telegram login.
func (s *Service) CreateTelegramAuthChallenge(_ context.Context) (*model.TelegramAuthChallenge, error) {
	rawToken, _, err := generateSessionToken()
	if err != nil {
		return nil, err
	}

	expiresAt := s.Now().Add(s.settings.TelegramAuthMaxAge)

	s.auth.mu.Lock()
	s.auth.byToken[rawToken] = &telegramAuthChallengeState{
		expiresAt: expiresAt,
	}
	s.auth.mu.Unlock()

	return &model.TelegramAuthChallenge{
		Token:       rawToken,
		BotStartURL: s.buildBotStartURL(rawToken),
		ExpiresAt:   expiresAt,
	}, nil
}

// ConfirmTelegramAuth stores Telegram user data for the one-time challenge.
func (s *Service) ConfirmTelegramAuth(_ context.Context, botToken, challengeToken string, payload model.TelegramAuthPayload) error {
	if !s.settings.DevBypass && strings.TrimSpace(botToken) != s.settings.BotToken {
		return profileerrors.ErrUnauthorized
	}
	if payload.ID == 0 {
		return profileerrors.ErrUnauthorized
	}

	challengeToken = strings.TrimSpace(challengeToken)
	if challengeToken == "" {
		return profileerrors.ErrUnauthorized
	}

	now := s.Now()

	s.auth.mu.Lock()
	defer s.auth.mu.Unlock()

	state, ok := s.auth.byToken[challengeToken]
	if !ok {
		return profileerrors.ErrUnauthorized
	}
	if !state.expiresAt.After(now) {
		delete(s.auth.byToken, challengeToken)
		return profileerrors.ErrUnauthorized
	}

	state.payload = payload
	state.confirmed = true
	return nil
}

func (s *Service) consumeConfirmedTelegramAuthChallenge(challengeToken string) (model.TelegramAuthPayload, error) {
	challengeToken = strings.TrimSpace(challengeToken)
	if challengeToken == "" {
		return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
	}

	now := s.Now()

	s.auth.mu.Lock()
	defer s.auth.mu.Unlock()

	state, ok := s.auth.byToken[challengeToken]
	if !ok {
		return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
	}
	if !state.expiresAt.After(now) {
		delete(s.auth.byToken, challengeToken)
		return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
	}
	if !state.confirmed || state.payload.ID == 0 {
		return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
	}

	delete(s.auth.byToken, challengeToken)
	return state.payload, nil
}
