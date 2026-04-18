package event

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// JoinEvent adds a user to an event.
func (s *Service) JoinEvent(ctx context.Context, eventID, userID uuid.UUID) (*model.Event, error) {
	event, err := s.repo.JoinEvent(ctx, eventID, userID)
	if err != nil {
		return nil, fmt.Errorf("join event: %w", err)
	}
	return event, nil
}
