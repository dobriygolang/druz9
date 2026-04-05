package circle

import (
	"context"

	"github.com/google/uuid"
)

// JoinCircle adds a user to a circle.
func (s *Service) JoinCircle(ctx context.Context, circleID, userID uuid.UUID) error {
	return s.repo.JoinCircle(ctx, circleID, userID)
}
