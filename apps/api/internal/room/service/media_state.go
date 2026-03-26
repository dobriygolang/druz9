package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// GetRoomMediaState retrieves media state for a room.
func (s *Service) GetRoomMediaState(ctx context.Context, roomID uuid.UUID, user *model.User) (*model.RoomMediaState, error) {
	return s.repo.GetRoomMediaState(ctx, roomID, user)
}

// UpsertRoomMediaState updates or inserts media state for a room.
func (s *Service) UpsertRoomMediaState(ctx context.Context, roomID uuid.UUID, user *model.User, req model.UpsertRoomMediaStateRequest) (*model.RoomMediaState, error) {
	return s.repo.UpsertRoomMediaState(ctx, roomID, user, req)
}