package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// FindUserByID retrieves a user by ID.
func (s *Service) FindUserByID(ctx context.Context, userID uuid.UUID) (*model.User, error) {
	return s.profiles.FindUserByID(ctx, userID)
}