package guild

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	arenarating "api/internal/domain/arena/rating"
	"api/internal/model"
)

// GetMemberStats returns enriched member stats for a guild.
func (s *Service) GetMemberStats(ctx context.Context, guildID, userID uuid.UUID) ([]*model.GuildMemberStats, error) {
	if _, err := s.repo.GetGuild(ctx, guildID); err != nil {
		return nil, fmt.Errorf("get guild: %w", err)
	}
	stats, err := s.repo.GetGuildMemberStats(ctx, guildID)
	if err != nil {
		return nil, fmt.Errorf("get guild member stats: %w", err)
	}
	for _, m := range stats {
		m.ArenaLeague = arenarating.LeagueName(m.ArenaRating)
	}
	return stats, nil
}
