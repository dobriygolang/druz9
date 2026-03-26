package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// GetRoom retrieves a specific room.
func (s *Service) GetRoom(ctx context.Context, roomID uuid.UUID, user *model.User) (*model.Room, error) {
	return s.repo.GetRoom(ctx, roomID, user)
}