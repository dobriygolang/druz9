package event

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// UpdateEvent updates an existing event.
func (s *Service) UpdateEvent(ctx context.Context, eventID uuid.UUID, actor *model.User, req model.UpdateEventRequest) (*model.Event, error) {
	event, err := s.repo.UpdateEvent(ctx, eventID, actor, req)
	if err != nil {
		return nil, fmt.Errorf("update event: %w", err)
	}
	return event, nil
}
