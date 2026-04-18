package admin

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

// DeleteUser deletes a user.
func (s *Service) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	if err := s.profiles.DeleteUser(ctx, userID); err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	return nil
}
