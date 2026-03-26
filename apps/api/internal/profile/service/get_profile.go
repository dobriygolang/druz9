package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// GetProfileByID retrieves user profile by ID.
func (s *Service) GetProfileByID(ctx context.Context, userID uuid.UUID) (*model.ProfileResponse, error) {
	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: user.Status == model.UserStatusPendingProfile,
	}, nil
}

// UpdateProfile updates user profile.
func (s *Service) UpdateProfile(ctx context.Context, userID uuid.UUID, name string) (*model.ProfileResponse, error) {
	user, err := s.repo.UpdateProfile(ctx, userID, name)
	if err != nil {
		return nil, err
	}

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: false,
	}, nil
}