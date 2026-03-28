package profile

import (
	"context"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

// CreateSession creates a new session.
func (s *Service) CreateSession(ctx context.Context, session *model.Session) error {
	return s.sessions.CreateSession(ctx, session)
}

// ReplaceSession replaces an existing session with a new one.
func (s *Service) ReplaceSession(ctx context.Context, hash string, session *model.Session) error {
	return s.sessions.ReplaceSession(ctx, hash, session)
}

// DeleteSessionByHash deletes a session by its hash.
func (s *Service) DeleteSessionByHash(ctx context.Context, hash string) error {
	return s.sessions.DeleteSessionByHash(ctx, hash)
}

// FindSessionByHash retrieves session and auth state by hash.
func (s *Service) FindSessionByHash(ctx context.Context, hash string) (*model.AuthState, error) {
	return s.sessions.FindSessionByHash(ctx, hash)
}

// TouchSession updates session activity timestamps.
func (s *Service) TouchSession(ctx context.Context, userID uuid.UUID, sessionID uuid.UUID, expiresAt time.Time, lastActive time.Time) error {
	return s.sessions.TouchSession(ctx, userID, sessionID, expiresAt, lastActive)
}

// NewSession creates a new session for a user.
func (s *Service) NewSession(ctx context.Context, userID uuid.UUID) (string, *model.Session, error) {
	rawToken, tokenHash, err := generateSessionToken()
	if err != nil {
		return "", nil, err
	}

	now := s.Now()
	session := &model.Session{
		ID:         uuid.New(),
		UserID:     userID,
		TokenHash:  tokenHash,
		LastSeenAt: now,
		ExpiresAt:  now.Add(s.settings.SessionTTL),
	}

	if err := s.sessions.CreateSession(ctx, session); err != nil {
		return "", nil, err
	}
	return rawToken, session, nil
}

// RotateSession rotates an existing session with a new token.
func (s *Service) RotateSession(ctx context.Context, currentSessionHash string, userID uuid.UUID) (string, *model.Session, error) {
	rawToken, tokenHash, err := generateSessionToken()
	if err != nil {
		return "", nil, err
	}

	now := s.Now()
	session := &model.Session{
		ID:         uuid.New(),
		UserID:     userID,
		TokenHash:  tokenHash,
		LastSeenAt: now,
		ExpiresAt:  now.Add(s.settings.SessionTTL),
	}

	if err := s.sessions.ReplaceSession(ctx, currentSessionHash, session); err != nil {
		return "", nil, err
	}
	return rawToken, session, nil
}

// ShouldRefresh returns whether a session should be refreshed based on last seen time.
func (s *Service) ShouldRefresh(lastSeenAt time.Time) bool {
	return s.settings.SessionRefreshAfter == 0 || s.Now().Sub(lastSeenAt) >= s.settings.SessionRefreshAfter
}
