package guild

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// ListGuilds retrieves guilds with pagination.
func (s *Service) ListGuilds(ctx context.Context, currentUserID uuid.UUID, opts model.ListGuildsOptions) (*model.ListGuildsResponse, error) {
	return s.repo.ListGuilds(ctx, currentUserID, opts)
}
