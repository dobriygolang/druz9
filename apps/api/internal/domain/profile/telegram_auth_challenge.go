package profile

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"fmt"
	"strings"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"
)

const maxLoginCodeAttempts = 5

// CreateTelegramAuthChallenge generates a one-time token for Telegram login.
func (s *Service) CreateTelegramAuthChallenge(_ context.Context) (*model.TelegramAuthChallenge, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return nil, fmt.Errorf("generate challenge token: %w", err)
	}

	token := fmt.Sprintf("%x", bytes)
	expiresAt := s.Now().Add(s.settings.TelegramAuthMaxAge)

	s.auth.mu.Lock()
	s.auth.byToken[token] = &telegramAuthChallengeState{
		expiresAt: expiresAt,
		confirmed: false,
	}
	s.auth.mu.Unlock()

	return &model.TelegramAuthChallenge{
		Token:       token,
		BotStartURL: s.buildBotStartURL(token),
		ExpiresAt:   expiresAt,
	}, nil
}

const telegramLoginCodeLength = 6

// ConfirmTelegramAuth stores Telegram user data for the one-time challenge and returns a one-time website code.
func (s *Service) ConfirmTelegramAuth(_ context.Context, botToken, challengeToken string, payload model.TelegramAuthPayload) (string, error) {
	if !s.settings.DevBypass && subtle.ConstantTimeCompare([]byte(strings.TrimSpace(botToken)), []byte(s.settings.BotToken)) != 1 {
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
			state.attempts++
			if state.attempts >= maxLoginCodeAttempts {
				delete(s.auth.byToken, challengeToken)
				delete(s.auth.byCode, state.loginCode)
			}
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

// generateTelegramLoginCode generates a cryptographically random decimal login code.
// Rejection sampling is used to avoid modulo bias: values >= 250 are discarded
// because 256 is not evenly divisible by 10 (250 = 25*10 is the largest safe cutoff).
func generateTelegramLoginCode() (string, error) {
	digits := make([]byte, telegramLoginCodeLength)
	b := [1]byte{}
	for i := range digits {
		for {
			if _, err := rand.Read(b[:]); err != nil {
				return "", fmt.Errorf("generate telegram login code: %w", err)
			}
			if b[0] < 250 {
				digits[i] = '0' + (b[0] % 10)
				break
			}
		}
	}
	return string(digits), nil
}

func normalizeTelegramLoginCode(value string) string {
	return strings.TrimSpace(value)
}
