package profile

import (
	"context"
	"strconv"

	"github.com/google/uuid"

	"api/internal/model"
)

// BindTelegram binds Telegram account to existing user profile.
func (s *Service) BindTelegram(ctx context.Context, userID uuid.UUID, challengeToken, loginCode string) (*model.ProfileResponse, int64, error) {
	payload, err := s.consumeConfirmedTelegramAuthChallenge(challengeToken, loginCode)
	if err != nil {
		return nil, 0, err
	}

	user, err := s.repo.BindIdentity(ctx, userID, model.IdentityAuthPayload{
		Provider:       model.AuthProviderTelegram,
		ProviderUserID: strconv.FormatInt(payload.ID, 10),
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
