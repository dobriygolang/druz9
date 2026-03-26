package service

import (
	"context"

	"api/internal/model"
)

// ListRooms retrieves rooms for a user with pagination.
func (s *Service) ListRooms(ctx context.Context, user *model.User, opts model.ListRoomsOptions) (*model.ListRoomsResponse, error) {
	return s.repo.ListRooms(ctx, user, opts)
}
