package guild

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// ListGuilds retrieves guilds with pagination.
func (s *Service) ListGuilds(ctx context.Context, currentUserID uuid.UUID, opts model.ListGuildsOptions) (*model.ListGuildsResponse, error) {
	return s.repo.ListGuilds(ctx, currentUserID, opts)
}
