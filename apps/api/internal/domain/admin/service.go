package admin

import (
	"context"

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
//
//go:generate mockery --case underscore --name ProfileRepository --with-expecter --output mocks
type ProfileRepository interface {
	DeleteUser(ctx context.Context, userID uuid.UUID) error
}

// NewService creates new admin domain service.
func NewService(c Config) *Service {
	return &Service{
		profiles: c.ProfileRepository,
	}
}
