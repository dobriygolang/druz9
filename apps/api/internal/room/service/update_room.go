package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// UpdateRoom updates an existing room.
func (s *Service) UpdateRoom(ctx context.Context, roomID uuid.UUID, user *model.User, req model.UpdateRoomRequest) (*model.Room, error) {
	return s.repo.UpdateRoom(ctx, roomID, user, req)
}
