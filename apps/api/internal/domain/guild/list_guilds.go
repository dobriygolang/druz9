package guild

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// ListGuilds retrieves guilds with pagination.
func (s *Service) ListGuilds(ctx context.Context, currentUserID uuid.UUID, opts model.ListGuildsOptions) (*model.ListGuildsResponse, error) {
	result, err := s.repo.ListGuilds(ctx, currentUserID, opts)
	if err != nil {
		return nil, fmt.Errorf("list guilds: %w", err)
	}
	return result, nil
}
