package profile

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"api/internal/model"
)

// CompleteRegistration completes user registration and returns profile response with session.
func (s *Service) CompleteRegistration(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.ProfileResponse, string, time.Time, error) {
	user, err := s.repo.CompleteRegistration(ctx, userID, req)
	if err != nil {
		return nil, "", time.Time{}, fmt.Errorf("complete registration: %w", err)
	}

	// Invalidate stale cached profile so subsequent GetProfile returns updated status.
	s.InvalidateProfileCache(userID)
	s.CacheProfile(userID, user)

	rawToken, session, err := s.NewSession(ctx, user.ID)
	if err != nil {
		return nil, "", time.Time{}, fmt.Errorf("create session: %w", err)
	}

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: false,
	}, rawToken, session.ExpiresAt, nil
}
