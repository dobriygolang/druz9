package service

import (
	"context"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

// CompleteRegistration completes user registration and returns profile response with session.
func (s *Service) CompleteRegistration(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.ProfileResponse, string, time.Time, error) {
	user, err := s.repo.CompleteRegistration(ctx, userID, req)
	if err != nil {
		return nil, "", time.Time{}, err
	}

	rawToken, session, err := s.NewSession(ctx, user.ID)
	if err != nil {
		return nil, "", time.Time{}, err
	}

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: false,
	}, rawToken, session.ExpiresAt, nil
}
