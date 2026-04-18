package event

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// UpdateEvent updates an existing event.
func (s *Service) UpdateEvent(ctx context.Context, eventID uuid.UUID, actor *model.User, req model.UpdateEventRequest) (*model.Event, error) {
	return s.repo.UpdateEvent(ctx, eventID, actor, req)
}
