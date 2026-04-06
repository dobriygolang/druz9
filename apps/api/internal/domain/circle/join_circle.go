package circle

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

// JoinCircle adds a user to a circle. Private circles require an invite.
func (s *Service) JoinCircle(ctx context.Context, circleID, userID uuid.UUID) error {
	circle, err := s.repo.GetCircle(ctx, circleID)
	if err != nil {
		return err
	}
	if !circle.IsPublic {
		return kratoserrors.Forbidden("CIRCLE_PRIVATE", "circle is private, joining requires an invite from the creator")
	}
	return s.repo.JoinCircle(ctx, circleID, userID)
}
