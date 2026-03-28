package event

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// ListEvents retrieves events for a given user with filtering and pagination.
func (s *Service) ListEvents(ctx context.Context, currentUserID uuid.UUID, opts model.ListEventsOptions) (*model.ListEventsResponse, error) {
	return s.repo.ListEvents(ctx, currentUserID, opts)
}
