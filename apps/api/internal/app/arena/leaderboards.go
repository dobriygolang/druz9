package arena

import (
	"context"

	"api/internal/model"
)

// GetGuildLeaderboard and GetSeasonXPLeaderboard used to live as a raw
// `leaderboardAggregator` type inside internal/api/arena, pulling a
// *pgxpool.Pool into the transport layer. They're now thin pass-throughs
// so the api handler stays pure mapping and the domain service owns the
// leaderboard concept next to the rest of arena.

func (s *Service) GetGuildLeaderboard(ctx context.Context, limit int32) ([]*model.GuildLeaderboardEntry, error) {
	return s.repo.ListGuildLeaderboard(ctx, limit)
}

func (s *Service) GetSeasonXPLeaderboard(ctx context.Context, limit int32) ([]*model.SeasonXPEntry, int32, error) {
	return s.repo.ListSeasonXPLeaderboard(ctx, limit)
}
