package guild

import (
	"context"

	"github.com/google/uuid"
)

// InviteToGuild lets the guild creator add another user directly.
// Only the creator can invite; enforced at the repository layer.
func (s *Service) InviteToGuild(ctx context.Context, guildID, inviterID, inviteeID uuid.UUID) error {
	return s.repo.InviteToGuild(ctx, guildID, inviterID, inviteeID)
}
