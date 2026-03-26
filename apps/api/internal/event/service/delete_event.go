package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// DeleteEvent deletes an event.
func (s *Service) DeleteEvent(ctx context.Context, eventID uuid.UUID, actor *model.User) error {
	return s.repo.DeleteEvent(ctx, eventID, actor)
}
