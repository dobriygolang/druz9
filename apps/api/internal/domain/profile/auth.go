package profile

import (
	"context"
	"strings"
	"time"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"
)

// TelegramAuth authenticates user via Telegram payload.
func (s *Service) TelegramAuth(ctx context.Context, payload model.TelegramAuthPayload) (*model.ProfileResponse, string, time.Time, error) {
	if err := s.validateTelegramPayload(payload); err != nil {
		return nil, "", time.Time{}, err
	}

	user, err := s.repo.UpsertTelegramUser(ctx, payload)
	if err != nil {
		return nil, "", time.Time{}, err
	}

	rawToken, session, err := s.NewSession(ctx, user.ID)
	if err != nil {
		return nil, "", time.Time{}, err
	}

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: user.Status == model.UserStatusPendingProfile,
	}, rawToken, session.ExpiresAt, nil
}

// AuthenticateByToken authenticates user by session token.
func (s *Service) AuthenticateByToken(ctx context.Context, rawToken string) (*model.AuthState, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return nil, profileerrors.ErrUnauthorized
	}

	authState, err := s.sessions.FindSessionByHash(ctx, hashToken(rawToken))
	if err != nil {
		return nil, err
	}

	now := s.Now()
	if !authState.Session.ExpiresAt.After(now) {
		_ = s.sessions.DeleteSessionByHash(ctx, authState.Session.TokenHash)
		return nil, profileerrors.ErrUnauthorized
	}

	shouldRefresh := s.ShouldRefresh(authState.Session.LastSeenAt)
	authState.Session.LastSeenAt = now
	authState.Session.ExpiresAt = now.Add(s.settings.SessionTTL)
	authState.User.LastActiveAt = now
	authState.User.ActivityStatus = model.ResolveActivityStatus(authState.User.LastActiveAt, now)
	if shouldRefresh {
		if err := s.sessions.TouchSession(ctx, authState.User.ID, authState.Session.ID, authState.Session.ExpiresAt, authState.Session.LastSeenAt); err != nil {
			return nil, err
		}
		authState.SessionExtended = true
	}

	authState.RawToken = rawToken
	return authState, nil
}
