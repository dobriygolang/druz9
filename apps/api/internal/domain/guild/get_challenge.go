package guild

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// GetActiveChallenge returns the currently active challenge for a guild, if any.
func (s *Service) GetActiveChallenge(ctx context.Context, guildID, userID uuid.UUID) (*model.GuildChallenge, error) {
	if _, err := s.repo.GetGuild(ctx, guildID); err != nil {
		return nil, err
	}
	return s.repo.GetActiveGuildChallenge(ctx, guildID)
}
