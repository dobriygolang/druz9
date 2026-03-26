package service

import (
	"context"

	"api/internal/model"
)

// CreateRoom creates a new room.
func (s *Service) CreateRoom(ctx context.Context, user *model.User, req model.CreateRoomRequest) (*model.Room, error) {
	return s.repo.CreateRoom(ctx, user, req)
}