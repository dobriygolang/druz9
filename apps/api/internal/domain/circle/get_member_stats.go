package circle

import (
	"context"

	arenarating "api/internal/arena/rating"
	"api/internal/model"

	"github.com/google/uuid"
)

// GetMemberStats returns enriched member stats for a circle.
func (s *Service) GetMemberStats(ctx context.Context, circleID, userID uuid.UUID) ([]*model.CircleMemberStats, error) {
	if _, err := s.repo.GetCircle(ctx, circleID); err != nil {
		return nil, err
	}
	stats, err := s.repo.GetCircleMemberStats(ctx, circleID)
	if err != nil {
		return nil, err
	}
	for _, m := range stats {
		m.ArenaLeague = arenarating.LeagueName(m.ArenaRating)
	}
	return stats, nil
}
