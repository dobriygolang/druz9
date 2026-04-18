package guild

import (
	"context"

	"github.com/google/uuid"
)

// LeaveGuild removes a user from a guild.
func (s *Service) LeaveGuild(ctx context.Context, guildID, userID uuid.UUID) error {
	return s.repo.LeaveGuild(ctx, guildID, userID)
}
