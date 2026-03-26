package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// JoinEvent adds a user to an event.
func (s *Service) JoinEvent(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (*model.Event, error) {
	event, err := s.repo.JoinEvent(ctx, eventID, userID)
	if err != nil {
		return nil, err
	}
	return event, nil
}
