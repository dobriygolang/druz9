package event

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

// LeaveEvent removes a user from an event.
func (s *Service) LeaveEvent(ctx context.Context, eventID, userID uuid.UUID) error {
	err := s.repo.LeaveEvent(ctx, eventID, userID)
	if err != nil {
		return fmt.Errorf("leave event: %w", err)
	}
	return nil
}
