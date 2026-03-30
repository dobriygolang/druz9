package profile

import (
	"context"
	"crypto/rand"
	"fmt"
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

const telegramLoginCodeLength = 6

// ConfirmTelegramAuth stores Telegram user data for the one-time challenge and returns a one-time website code.
func (s *Service) ConfirmTelegramAuth(_ context.Context, botToken, challengeToken string, payload model.TelegramAuthPayload) (string, error) {
	if !s.settings.DevBypass && strings.TrimSpace(botToken) != s.settings.BotToken {
		return "", profileerrors.ErrUnauthorized
	}
	if payload.ID == 0 {
		return "", profileerrors.ErrUnauthorized
	}

	challengeToken = strings.TrimSpace(challengeToken)
	if challengeToken == "" {
		return "", profileerrors.ErrUnauthorized
	}

	now := s.Now()

	s.auth.mu.Lock()
	defer s.auth.mu.Unlock()

	state, ok := s.auth.byToken[challengeToken]
	if !ok {
		return "", profileerrors.ErrUnauthorized
	}
	if !state.expiresAt.After(now) {
		delete(s.auth.byToken, challengeToken)
		return "", profileerrors.ErrUnauthorized
	}

	loginCode, err := generateTelegramLoginCode()
	if err != nil {
		return "", err
	}

	state.payload = payload
	state.loginCode = loginCode
	state.confirmed = false
	return loginCode, nil
}

func (s *Service) consumeConfirmedTelegramAuthChallenge(challengeToken, loginCode string) (model.TelegramAuthPayload, error) {
	challengeToken = strings.TrimSpace(challengeToken)
	if challengeToken == "" {
		return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
	}
	loginCode = normalizeTelegramLoginCode(loginCode)

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
	if state.payload.ID == 0 {
		return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
	}
	switch {
	case state.loginCode != "":
		if loginCode == "" || loginCode != state.loginCode {
			return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
		}
	case !state.confirmed:
		return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
	}

	delete(s.auth.byToken, challengeToken)
	return state.payload, nil
}

func generateTelegramLoginCode() (string, error) {
	bytes := make([]byte, telegramLoginCodeLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generate telegram login code: %w", err)
	}

	for index, value := range bytes {
		bytes[index] = '0' + (value % 10)
	}

	return string(bytes), nil
}

func normalizeTelegramLoginCode(value string) string {
	return strings.TrimSpace(value)
}
