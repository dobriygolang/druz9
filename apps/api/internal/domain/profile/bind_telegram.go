package profile

import (
	"context"
	"fmt"

	"api/internal/model"

	"github.com/google/uuid"
)

// BindTelegram binds Telegram account to existing user profile.
func (s *Service) BindTelegram(ctx context.Context, userID uuid.UUID, challengeToken, loginCode string) (*model.ProfileResponse, int64, error) {
	payload, err := s.consumeConfirmedTelegramAuthChallenge(challengeToken, loginCode)
	if err != nil {
		return nil, 0, err
	}

	user, err := s.repo.BindIdentity(ctx, userID, model.IdentityAuthPayload{
		Provider:       model.AuthProviderTelegram,
		ProviderUserID: fmt.Sprintf("%d", payload.ID),
		Username:       payload.Username,
		FirstName:      payload.FirstName,
		LastName:       payload.LastName,
		AvatarURL:      normalizeAvatarURL(payload.PhotoURL),
	})
	if err != nil {
		return nil, 0, err
	}

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: false,
	}, payload.ID, nil
}
