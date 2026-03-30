package admin

import (
	"context"

	"github.com/google/uuid"
)

// DeleteUser deletes a user.
func (s *Service) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	return s.profiles.DeleteUser(ctx, userID)
}
