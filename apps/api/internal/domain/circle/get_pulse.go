package circle

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// GetPulse returns aggregated activity data for a circle.
func (s *Service) GetPulse(ctx context.Context, circleID, userID uuid.UUID) (*model.CirclePulse, error) {
	if _, err := s.repo.GetCircle(ctx, circleID); err != nil {
		return nil, err
	}
	return s.repo.GetCirclePulse(ctx, circleID)
}
