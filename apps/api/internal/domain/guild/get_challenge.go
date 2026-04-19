package guild

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// GetActiveChallenge returns the currently active challenge for a guild, if any.
func (s *Service) GetActiveChallenge(ctx context.Context, guildID, userID uuid.UUID) (*model.GuildChallenge, error) {
	if _, err := s.repo.GetGuild(ctx, guildID); err != nil {
		return nil, fmt.Errorf("get guild: %w", err)
	}
	challenge, err := s.repo.GetActiveGuildChallenge(ctx, guildID)
	if err != nil {
		return nil, fmt.Errorf("get active guild challenge: %w", err)
	}
	return challenge, nil
}
