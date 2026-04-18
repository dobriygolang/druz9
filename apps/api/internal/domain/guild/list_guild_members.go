package guild

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// ListGuildMembers returns member profiles for a guild.
func (s *Service) ListGuildMembers(ctx context.Context, guildID uuid.UUID, limit int32) ([]*model.GuildMemberProfile, error) {
	return s.repo.ListGuildMembers(ctx, guildID, limit)
}
