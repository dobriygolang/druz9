package circle

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// ListCircles retrieves circles with pagination.
func (s *Service) ListCircles(ctx context.Context, currentUserID uuid.UUID, opts model.ListCirclesOptions) (*model.ListCirclesResponse, error) {
	return s.repo.ListCircles(ctx, currentUserID, opts)
}
