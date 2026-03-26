package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// Config represents admin domain service configuration.
type Config struct {
	ProfileRepository ProfileRepository
}

// Service implements admin domain logic.
type Service struct {
	profiles ProfileRepository
}

// ProfileRepository is a data-layer interface for profile queries.
type ProfileRepository interface {
	DeleteUser(ctx context.Context, userID uuid.UUID) error
	FindUserByID(ctx context.Context, userID uuid.UUID) (*model.User, error)
}

// NewAdminService creates new admin domain service.
func NewAdminService(c Config) *Service {
	return &Service{
		profiles: c.ProfileRepository,
	}
}