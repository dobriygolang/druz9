package guild

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// ListGuildMembers returns member profiles for a guild.
func (s *Service) ListGuildMembers(ctx context.Context, guildID uuid.UUID, limit int32) ([]*model.GuildMemberProfile, error) {
	members, err := s.repo.ListGuildMembers(ctx, guildID, limit)
	if err != nil {
		return nil, fmt.Errorf("list guild members: %w", err)
	}
	return members, nil
}
