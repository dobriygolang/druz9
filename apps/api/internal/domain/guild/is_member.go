package guild

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

// IsMember reports whether userID is a member of guildID.
func (s *Service) IsMember(ctx context.Context, guildID, userID uuid.UUID) (bool, error) {
	result, err := s.repo.IsMember(ctx, guildID, userID)
	if err != nil {
		return false, fmt.Errorf("is member: %w", err)
	}
	return result, nil
}
