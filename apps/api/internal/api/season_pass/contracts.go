package season_pass

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// Service is the interface consumed by transport handlers.
type Service interface {
	GetActive(ctx context.Context, userID uuid.UUID) (*model.SeasonPassSnapshot, error)
	ClaimTierReward(ctx context.Context, userID uuid.UUID, tier int32, track model.RewardTrack) (*model.ClaimOutcome, error)
	PurchasePremium(ctx context.Context, userID uuid.UUID) (*model.SeasonPassProgress, error)
}
