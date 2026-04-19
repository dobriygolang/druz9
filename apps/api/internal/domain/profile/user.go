package profile

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// FindUserByID retrieves a user by ID.
func (s *Service) FindUserByID(ctx context.Context, userID uuid.UUID) (*model.User, error) {
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("find user by id: %w", err)
	}
	return user, nil
}

// UpdateLocation updates user location.
func (s *Service) UpdateLocation(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.ProfileResponse, error) {
	user, err := s.repo.UpdateLocation(ctx, userID, req)
	if err != nil {
		return nil, fmt.Errorf("update location: %w", err)
	}

	// Invalidate and update cache
	s.InvalidateProfileCache(userID)
	s.CacheProfile(userID, user)

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: false,
	}, nil
}
