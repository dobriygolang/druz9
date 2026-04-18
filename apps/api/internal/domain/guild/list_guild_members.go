package guild

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// ListGuildMembers returns member profiles for a guild.
func (s *Service) ListGuildMembers(ctx context.Context, guildID uuid.UUID, limit int32) ([]*model.GuildMemberProfile, error) {
	return s.repo.ListGuildMembers(ctx, guildID, limit)
}
