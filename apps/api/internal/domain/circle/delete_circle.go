package circle

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

// DeleteCircle permanently deletes a circle. Only the creator may delete.
func (s *Service) DeleteCircle(ctx context.Context, circleID, userID uuid.UUID) error {
	circle, err := s.repo.GetCircle(ctx, circleID)
	if err != nil {
		return err
	}
	if circle.CreatorID != userID {
		return kratoserrors.Forbidden("FORBIDDEN", "only the circle creator can delete this circle")
	}
	return s.repo.DeleteCircle(ctx, circleID)
}
