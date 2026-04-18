package event

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// DeleteEvent deletes an event.
func (s *Service) DeleteEvent(ctx context.Context, eventID uuid.UUID, actor *model.User) error {
	err := s.repo.DeleteEvent(ctx, eventID, actor)
	if err != nil {
		return fmt.Errorf("delete event: %w", err)
	}
	return nil
}
