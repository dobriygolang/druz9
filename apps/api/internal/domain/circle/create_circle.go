package circle

import (
	"context"

	"api/internal/model"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

// CreateCircle creates a new circle.
func (s *Service) CreateCircle(ctx context.Context, creatorID uuid.UUID, name, description string, tags []string) (*model.Circle, error) {
	if name == "" {
		return nil, kratoserrors.BadRequest("INVALID_PAYLOAD", "name is required")
	}
	return s.repo.CreateCircle(ctx, creatorID, name, description, tags)
}
