package event

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// ListEvents retrieves events for a given user with filtering and pagination.
func (s *Service) ListEvents(ctx context.Context, currentUserID uuid.UUID, opts model.ListEventsOptions) (*model.ListEventsResponse, error) {
	return s.repo.ListEvents(ctx, currentUserID, opts)
}
