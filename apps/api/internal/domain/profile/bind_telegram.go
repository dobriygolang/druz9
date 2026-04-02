package profile

import (
	"context"
	"errors"
	"fmt"
	stdErrors "errors"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"

	"github.com/google/uuid"
)

// BindTelegram binds Telegram account to existing user profile.
func (s *Service) BindTelegram(ctx context.Context, userID uuid.UUID, challengeToken, loginCode string) (*model.ProfileResponse, error) {
	payload, err := s.consumeConfirmedTelegramAuthChallenge(challengeToken, loginCode)
	if err != nil {
		return nil, err
	}

	// Check if telegram_id is already bound to another user
	existingUser, err := s.repo.FindUserByProviderIdentity(ctx, model.AuthProviderTelegram, fmt.Sprintf("%d", payload.ID))
	if err != nil && !stdErrors.Is(err, profileerrors.ErrUserNotFound) {
		return nil, err
	}
	if existingUser != nil && existingUser.ID != userID {
		return nil, profileerrors.ErrTelegramAlreadyBound
	}

	user, err := s.repo.BindIdentity(ctx, userID, model.IdentityAuthPayload{
		Provider:       model.AuthProviderTelegram,
		ProviderUserID: fmt.Sprintf("%d", payload.ID),
		Username:       payload.Username,
		FirstName:      payload.FirstName,
		LastName:       payload.LastName,
		AvatarURL:      payload.PhotoURL,
	})
	if err != nil {
		if errors.Is(err, profileerrors.ErrUserNotFound) {
			return nil, profileerrors.ErrUserNotFound
		}
		return nil, err
	}

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: false,
	}, nil
}
