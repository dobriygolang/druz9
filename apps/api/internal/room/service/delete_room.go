package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// DeleteRoom deletes a room.
func (s *Service) DeleteRoom(ctx context.Context, roomID uuid.UUID, user *model.User) error {
	return s.repo.DeleteRoom(ctx, roomID, user)
}
