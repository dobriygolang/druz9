package circle

import (
	"context"

	"github.com/google/uuid"
)

// LeaveCircle removes a user from a circle.
func (s *Service) LeaveCircle(ctx context.Context, circleID, userID uuid.UUID) error {
	return s.repo.LeaveCircle(ctx, circleID, userID)
}
