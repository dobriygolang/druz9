package guild

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/model"
)

// CreateGuild creates a new guild.
func (s *Service) CreateGuild(ctx context.Context, creatorID uuid.UUID, name, description string, tags []string, isPublic bool) (*model.Guild, error) {
	if name == "" {
		return nil, kratoserrors.BadRequest("INVALID_PAYLOAD", "name is required")
	}
	return s.repo.CreateGuild(ctx, creatorID, name, description, tags, isPublic)
}
