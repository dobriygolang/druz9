package guild

import (
	"context"

	arenarating "api/internal/arena/rating"
	"api/internal/model"

	"github.com/google/uuid"
)

// GetMemberStats returns enriched member stats for a guild.
func (s *Service) GetMemberStats(ctx context.Context, guildID, userID uuid.UUID) ([]*model.GuildMemberStats, error) {
	if _, err := s.repo.GetGuild(ctx, guildID); err != nil {
		return nil, err
	}
	stats, err := s.repo.GetGuildMemberStats(ctx, guildID)
	if err != nil {
		return nil, err
	}
	for _, m := range stats {
		m.ArenaLeague = arenarating.LeagueName(m.ArenaRating)
	}
	return stats, nil
}
