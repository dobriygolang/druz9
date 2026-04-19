package profile

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"
)

// TelegramAuth authenticates user via Telegram challenge token and one-time code.
func (s *Service) TelegramAuth(ctx context.Context, challengeToken, loginCode string) (*model.ProfileResponse, string, time.Time, int64, error) {
	payload, err := s.consumeConfirmedTelegramAuthChallenge(challengeToken, loginCode)
	if err != nil {
		return nil, "", time.Time{}, 0, fmt.Errorf("consume telegram auth challenge: %w", err)
	}

	user, err := s.repo.UpsertUserByIdentity(ctx, model.IdentityAuthPayload{
		Provider:       model.AuthProviderTelegram,
		ProviderUserID: strconv.FormatInt(payload.ID, 10),
		Username:       payload.Username,
		FirstName:      payload.FirstName,
		LastName:       payload.LastName,
		AvatarURL:      normalizeAvatarURL(payload.PhotoURL),
	})
	if err != nil {
		return nil, "", time.Time{}, 0, fmt.Errorf("upsert user by identity: %w", err)
	}

	rawToken, session, err := s.NewSession(ctx, user.ID)
	if err != nil {
		return nil, "", time.Time{}, 0, fmt.Errorf("create session: %w", err)
	}

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: user.Status == model.UserStatusPendingProfile,
	}, rawToken, session.ExpiresAt, payload.ID, nil
}

// AuthenticateByToken authenticates user by session token.
func (s *Service) AuthenticateByToken(ctx context.Context, rawToken string) (*model.AuthState, error) {
	rawToken = strings.TrimSpace(rawToken)
	if rawToken == "" {
		return nil, profileerrors.ErrUnauthorized
	}

	authState, err := s.sessions.FindSessionByHash(ctx, hashToken(rawToken))
	if err != nil {
		return nil, fmt.Errorf("find session by hash: %w", err)
	}

	now := s.Now()
	if !authState.Session.ExpiresAt.After(now) {
		_ = s.sessions.DeleteSessionByHash(ctx, authState.Session.TokenHash)
		return nil, profileerrors.ErrUnauthorized
	}

	shouldRefresh := s.ShouldRefresh(authState.Session.LastSeenAt)
	authState.Session.LastSeenAt = now
	authState.Session.ExpiresAt = now.Add(s.settings.SessionTTL)
	s.SetUserActivity(authState.User.ID, now)
	authState.User.LastActiveAt = now
	authState.User.ActivityStatus = model.ResolveActivityStatus(authState.User.LastActiveAt, now)
	if shouldRefresh {
		if err := s.sessions.TouchSession(ctx, authState.User.ID, authState.Session.ID, authState.Session.ExpiresAt, authState.Session.LastSeenAt); err != nil {
			return nil, fmt.Errorf("touch session: %w", err)
		}
		authState.SessionExtended = true
	}

	authState.RawToken = rawToken
	return authState, nil
}
