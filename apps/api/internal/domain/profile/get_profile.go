package profile

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// GetProfileByID retrieves user profile by ID.
func (s *Service) GetProfileByID(ctx context.Context, userID uuid.UUID) (*model.ProfileResponse, error) {
	// Try cache first
	if user, ok := s.GetCachedProfile(userID); ok {
		// Update activity from cache (in-memory, more up-to-date)
		if lastActive, ok := s.GetUserActivity(userID); ok {
			user.LastActiveAt = lastActive
			user.ActivityStatus = model.ResolveActivityStatus(lastActive, s.Now())
		}
		return &model.ProfileResponse{
			User:                 user,
			NeedsProfileComplete: user.Status == model.UserStatusPendingProfile,
		}, nil
	}

	user, err := s.repo.FindUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Cache the profile
	s.CacheProfile(userID, user)

	// Get activity from cache (in-memory, more up-to-date)
	if lastActive, ok := s.GetUserActivity(userID); ok {
		user.LastActiveAt = lastActive
		user.ActivityStatus = model.ResolveActivityStatus(lastActive, s.Now())
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

	// Invalidate and update cache
	s.InvalidateProfileCache(userID)
	s.CacheProfile(userID, user)

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: false,
	}, nil
}
