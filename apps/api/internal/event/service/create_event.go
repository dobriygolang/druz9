package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// CreateEvent creates a new event.
func (s *Service) CreateEvent(ctx context.Context, creatorID uuid.UUID, req model.CreateEventRequest) (*model.Event, error) {
	return s.repo.CreateEvent(ctx, creatorID, req)
}