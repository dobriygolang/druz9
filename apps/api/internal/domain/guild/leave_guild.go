package guild

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

// LeaveGuild removes a user from a guild.
func (s *Service) LeaveGuild(ctx context.Context, guildID, userID uuid.UUID) error {
	if err := s.repo.LeaveGuild(ctx, guildID, userID); err != nil {
		return fmt.Errorf("leave guild: %w", err)
	}
	return nil
}
