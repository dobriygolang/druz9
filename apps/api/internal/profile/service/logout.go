package service

import (
	"context"
)

// Logout removes user session.
func (s *Service) Logout(ctx context.Context, sessionHash string) error {
	return s.sessions.DeleteSessionByHash(ctx, sessionHash)
}
