package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// EnsureRoomMembership ensures user is a member of the room.
func (s *Service) EnsureRoomMembership(ctx context.Context, roomID uuid.UUID, user *model.User) (*model.Room, error) {
	return s.repo.EnsureRoomMembership(ctx, roomID, user)
}
