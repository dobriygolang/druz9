package guild

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

// DeleteGuild permanently deletes a guild. Only the creator may delete.
func (s *Service) DeleteGuild(ctx context.Context, guildID, userID uuid.UUID) error {
	guild, err := s.repo.GetGuild(ctx, guildID)
	if err != nil {
		return err
	}
	if guild.CreatorID != userID {
		return kratoserrors.Forbidden("FORBIDDEN", "only the guild creator can delete this guild")
	}
	return s.repo.DeleteGuild(ctx, guildID)
}
