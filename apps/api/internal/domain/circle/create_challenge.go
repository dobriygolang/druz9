package circle

import (
	"context"
	"time"

	"api/internal/model"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

// CreateChallenge creates a new weekly challenge for a circle. Only the creator can do this.
func (s *Service) CreateChallenge(
	ctx context.Context,
	circleID, userID uuid.UUID,
	templateKey string,
	targetValue int32,
) (*model.CircleChallenge, error) {
	circle, err := s.repo.GetCircle(ctx, circleID)
	if err != nil {
		return nil, err
	}
	if circle.CreatorID != userID {
		return nil, kratoserrors.Forbidden("FORBIDDEN", "only the circle creator can create challenges")
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

	return s.repo.CreateCircleChallenge(ctx, model.CreateCircleChallengeRequest{
		CircleID:    circleID,
		TemplateKey: templateKey,
		TargetValue: targetValue,
		StartsAt:    startsAt,
		EndsAt:      endsAt,
		CreatedBy:   userID,
	})
}
