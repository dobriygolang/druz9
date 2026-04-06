package circle

import (
	"context"

	"github.com/google/uuid"
)

// IsMember reports whether userID is a member of circleID.
func (s *Service) IsMember(ctx context.Context, circleID, userID uuid.UUID) (bool, error) {
	return s.repo.IsMember(ctx, circleID, userID)
}
