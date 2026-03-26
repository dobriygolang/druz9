package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// UpsertTelegramUser creates or updates a user from Telegram auth payload.
func (s *Service) UpsertTelegramUser(ctx context.Context, payload model.TelegramAuthPayload) (*model.User, error) {
	return s.repo.UpsertTelegramUser(ctx, payload)
}

// FindUserByID retrieves a user by ID.
func (s *Service) FindUserByID(ctx context.Context, userID uuid.UUID) (*model.User, error) {
	return s.repo.FindUserByID(ctx, userID)
}

// DeleteUser deletes a user.
func (s *Service) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	return s.repo.DeleteUser(ctx, userID)
}

// UpdateLocation updates user location.
func (s *Service) UpdateLocation(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.ProfileResponse, error) {
	user, err := s.repo.UpdateLocation(ctx, userID, req)
	if err != nil {
		return nil, err
	}

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: false,
	}, nil
}