package profile

import (
	"context"
	"fmt"
)

// Logout removes user session.
func (s *Service) Logout(ctx context.Context, sessionHash string) error {
	if err := s.sessions.DeleteSessionByHash(ctx, sessionHash); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}
