package arena

import (
	"context"
	"fmt"

	"api/internal/model"
)

// GetGuildLeaderboard and GetSeasonXPLeaderboard used to live as a raw
// `leaderboardAggregator` type inside internal/api/arena, pulling a
// *pgxpool.Pool into the transport layer. They're now thin pass-throughs
// so the api handler stays pure mapping and the domain service owns the
// leaderboard concept next to the rest of arena.

func (s *Service) GetGuildLeaderboard(ctx context.Context, limit int32) ([]*model.GuildLeaderboardEntry, error) {
	entries, err := s.repo.ListGuildLeaderboard(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("list guild leaderboard: %w", err)
	}
	return entries, nil
}

func (s *Service) GetSeasonXPLeaderboard(ctx context.Context, limit int32) ([]*model.SeasonXPEntry, int32, error) {
	entries, total, err := s.repo.ListSeasonXPLeaderboard(ctx, limit)
	if err != nil {
		return nil, 0, fmt.Errorf("list season xp leaderboard: %w", err)
	}
	return entries, total, nil
}
