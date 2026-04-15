package circle

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// GetActiveChallenge returns the currently active challenge for a circle, if any.
func (s *Service) GetActiveChallenge(ctx context.Context, circleID, userID uuid.UUID) (*model.CircleChallenge, error) {
	if _, err := s.repo.GetCircle(ctx, circleID); err != nil {
		return nil, err
	}
	return s.repo.GetActiveCircleChallenge(ctx, circleID)
}
