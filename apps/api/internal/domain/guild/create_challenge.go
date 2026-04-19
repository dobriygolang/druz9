package guild

import (
	"context"
	"fmt"
	"time"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/model"
)

// CreateChallenge creates a new weekly challenge for a guild. Only the creator can do this.
func (s *Service) CreateChallenge(
	ctx context.Context,
	guildID, userID uuid.UUID,
	templateKey string,
	targetValue int32,
) (*model.GuildChallenge, error) {
	guild, err := s.repo.GetGuild(ctx, guildID)
	if err != nil {
		return nil, fmt.Errorf("get guild: %w", err)
	}
	if guild.CreatorID != userID {
		return nil, kratoserrors.Forbidden("FORBIDDEN", "only the guild creator can create challenges")
	}

	validTemplates := map[string]bool{
		"streak_days":      true,
		"daily_completion": true,
		"duels_count":      true,
		"mocks_count":      true,
	}
	if !validTemplates[templateKey] {
		return nil, kratoserrors.BadRequest("INVALID_TEMPLATE", "invalid challenge template")
	}
	if targetValue <= 0 {
		return nil, kratoserrors.BadRequest("INVALID_TARGET", "target value must be positive")
	}

	now := time.Now().UTC()
	startsAt := now
	endsAt := now.AddDate(0, 0, 7)

	challenge, err := s.repo.CreateGuildChallenge(ctx, model.CreateGuildChallengeRequest{
		GuildID:     guildID,
		TemplateKey: templateKey,
		TargetValue: targetValue,
		StartsAt:    startsAt,
		EndsAt:      endsAt,
		CreatedBy:   userID,
	})
	if err != nil {
		return nil, fmt.Errorf("create guild challenge: %w", err)
	}
	return challenge, nil
}