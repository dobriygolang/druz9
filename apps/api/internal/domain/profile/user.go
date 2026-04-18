package profile

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// FindUserByID retrieves a user by ID.
func (s *Service) FindUserByID(ctx context.Context, userID uuid.UUID) (*model.User, error) {
	return s.repo.FindUserByID(ctx, userID)
}

// UpdateLocation updates user location.
func (s *Service) UpdateLocation(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.ProfileResponse, error) {
	user, err := s.repo.UpdateLocation(ctx, userID, req)
	if err != nil {
		return nil, err
	}

	// Invalidate and update cache
	s.InvalidateProfileCache(userID)
	s.CacheProfile(userID, user)

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: false,
	}, nil
}
