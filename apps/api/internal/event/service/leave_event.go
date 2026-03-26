package service

import (
	"context"

	"github.com/google/uuid"
)

// LeaveEvent removes a user from an event.
func (s *Service) LeaveEvent(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error {
	return s.repo.LeaveEvent(ctx, eventID, userID)
}