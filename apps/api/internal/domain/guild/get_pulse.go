package guild

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// GetPulse returns aggregated activity data for a guild.
func (s *Service) GetPulse(ctx context.Context, guildID, userID uuid.UUID) (*model.GuildPulse, error) {
	if _, err := s.repo.GetGuild(ctx, guildID); err != nil {
		return nil, err
	}
	return s.repo.GetGuildPulse(ctx, guildID)
}
