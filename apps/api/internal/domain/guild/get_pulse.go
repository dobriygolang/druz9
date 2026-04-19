package guild

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// GetPulse returns aggregated activity data for a guild.
func (s *Service) GetPulse(ctx context.Context, guildID, userID uuid.UUID) (*model.GuildPulse, error) {
	if _, err := s.repo.GetGuild(ctx, guildID); err != nil {
		return nil, fmt.Errorf("get guild: %w", err)
	}
	pulse, err := s.repo.GetGuildPulse(ctx, guildID)
	if err != nil {
		return nil, fmt.Errorf("get guild pulse: %w", err)
	}
	return pulse, nil
}
