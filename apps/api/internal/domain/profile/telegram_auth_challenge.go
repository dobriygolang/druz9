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
	expiresAt := s.Now().Add(s.settings.TelegramAuthMaxAge)

	return &model.TelegramAuthChallenge{
		Token:       "",
		BotStartURL: s.buildBotStartURL(""),
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

	s.auth.mu.Lock()
	defer s.auth.mu.Unlock()

	loginCode, err := generateTelegramLoginCode()
	if err != nil {
		return "", err
	}

	now := s.Now()
	state := &telegramAuthChallengeState{
		payload:   payload,
		expiresAt: now.Add(s.settings.TelegramAuthMaxAge),
		confirmed: true,
		loginCode: loginCode,
	}
	s.auth.byCode[loginCode] = state

	challengeToken = strings.TrimSpace(challengeToken)
	if challengeToken != "" {
		if challengeState, ok := s.auth.byToken[challengeToken]; ok {
			if !challengeState.expiresAt.After(now) {
				delete(s.auth.byToken, challengeToken)
			} else {
				challengeState.payload = payload
				challengeState.loginCode = loginCode
				challengeState.confirmed = true
				s.auth.byCode[loginCode] = challengeState
			}
		}
	}

	return loginCode, nil
}

func (s *Service) consumeConfirmedTelegramAuthChallenge(challengeToken, loginCode string) (model.TelegramAuthPayload, error) {
	loginCode = normalizeTelegramLoginCode(loginCode)

	now := s.Now()

	s.auth.mu.Lock()
	defer s.auth.mu.Unlock()

	if loginCode != "" {
		if state, ok := s.auth.byCode[loginCode]; ok {
			if !state.expiresAt.After(now) {
				delete(s.auth.byCode, loginCode)
				return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
			}
			if state.payload.ID == 0 {
				return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
			}
			delete(s.auth.byCode, loginCode)
			if challengeToken = strings.TrimSpace(challengeToken); challengeToken != "" {
				delete(s.auth.byToken, challengeToken)
			}
			return state.payload, nil
		}
	}

	challengeToken = strings.TrimSpace(challengeToken)
	if challengeToken == "" {
		return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
	}

	state, ok := s.auth.byToken[challengeToken]
	if !ok {
		return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
	}
	if !state.expiresAt.After(now) {
		delete(s.auth.byToken, challengeToken)
		if state.loginCode != "" {
			delete(s.auth.byCode, state.loginCode)
		}
		return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
	}
	if state.payload.ID == 0 {
		return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
	}
	if state.loginCode != "" {
		if loginCode == "" || loginCode != state.loginCode {
			return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
		}
	} else if !state.confirmed {
		return model.TelegramAuthPayload{}, profileerrors.ErrUnauthorized
	}

	delete(s.auth.byToken, challengeToken)
	if state.loginCode != "" {
		delete(s.auth.byCode, state.loginCode)
	}
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
