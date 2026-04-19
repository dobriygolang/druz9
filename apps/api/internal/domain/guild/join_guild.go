package guild

import (
	"context"
	"fmt"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

// JoinGuild adds a user to a guild. Private guilds require an invite.
func (s *Service) JoinGuild(ctx context.Context, guildID, userID uuid.UUID) error {
	guild, err := s.repo.GetGuild(ctx, guildID)
	if err != nil {
		return fmt.Errorf("get guild: %w", err)
	}
	if !guild.IsPublic {
		return kratoserrors.Forbidden("GUILD_PRIVATE", "guild is private, joining requires an invite from the creator")
	}
	if err := s.repo.JoinGuild(ctx, guildID, userID); err != nil {
		return fmt.Errorf("join guild: %w", err)
	}
	return nil
}
