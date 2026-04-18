package event

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// ListEvents retrieves events for a given user with filtering and pagination.
func (s *Service) ListEvents(ctx context.Context, currentUserID uuid.UUID, opts model.ListEventsOptions) (*model.ListEventsResponse, error) {
	resp, err := s.repo.ListEvents(ctx, currentUserID, opts)
	if err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}
	return resp, nil
}
