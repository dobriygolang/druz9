package guild

import (
	"context"

	"github.com/google/uuid"
)

// IsMember reports whether userID is a member of guildID.
func (s *Service) IsMember(ctx context.Context, guildID, userID uuid.UUID) (bool, error) {
	return s.repo.IsMember(ctx, guildID, userID)
}
