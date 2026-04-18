package event

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// DeleteEvent deletes an event.
func (s *Service) DeleteEvent(ctx context.Context, eventID uuid.UUID, actor *model.User) error {
	return s.repo.DeleteEvent(ctx, eventID, actor)
}
