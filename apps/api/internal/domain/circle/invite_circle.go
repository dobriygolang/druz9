package circle

import (
	"context"

	"github.com/google/uuid"
)

// InviteToCircle lets the circle creator add another user directly.
// Only the creator can invite; enforced at the repository layer.
func (s *Service) InviteToCircle(ctx context.Context, circleID, inviterID, inviteeID uuid.UUID) error {
	return s.repo.InviteToCircle(ctx, circleID, inviterID, inviteeID)
}
