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

	// Admin CRUD
	AdminListPasses(ctx context.Context) ([]*model.SeasonPass, error)
	AdminCreatePass(ctx context.Context, p *model.SeasonPass) (*model.SeasonPass, error)
	AdminUpdatePass(ctx context.Context, p *model.SeasonPass) (*model.SeasonPass, error)
	AdminDeletePass(ctx context.Context, id uuid.UUID) error
	AdminUpsertTier(ctx context.Context, seasonPassID uuid.UUID, t *model.SeasonPassTier) (*model.SeasonPassTier, error)
	AdminDeleteTier(ctx context.Context, seasonPassID uuid.UUID, tier int32) error
}
