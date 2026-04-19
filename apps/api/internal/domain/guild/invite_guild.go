package guild

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

// InviteToGuild lets the guild creator add another user directly.
// Only the creator can invite; enforced at the repository layer.
func (s *Service) InviteToGuild(ctx context.Context, guildID, inviterID, inviteeID uuid.UUID) error {
	if err := s.repo.InviteToGuild(ctx, guildID, inviterID, inviteeID); err != nil {
		return fmt.Errorf("invite to guild: %w", err)
	}
	return nil
}
