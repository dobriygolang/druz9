package season_pass

import (
	"context"
	goerr "errors"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	seasonpassdomain "api/internal/domain/season_pass"
	"api/internal/model"
	v1 "api/pkg/api/season_pass/v1"
)

func (i *Implementation) ClaimTierReward(ctx context.Context, req *v1.ClaimTierRewardRequest) (*v1.ClaimTierRewardResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if req.GetTier() <= 0 {
		return nil, errors.BadRequest("INVALID_TIER", "tier must be positive")
	}
	out, err := i.service.ClaimTierReward(ctx, user.ID, req.GetTier(), model.RewardTrack(req.GetTrack()))
	if err != nil {
		return nil, mapClaimError(err)
	}
	return &v1.ClaimTierRewardResponse{
		Progress:      mapProgress(out.Progress),
		ClaimedKind:   v1.RewardKind(out.Kind),
		ClaimedAmount: out.Amount,
		ClaimedLabel:  out.Label,
	}, nil
}

func mapClaimError(err error) error {
	switch {
	case goerr.Is(err, seasonpassdomain.ErrNoActivePass):
		return errors.NotFound("NO_ACTIVE_PASS", "no active season pass")
	case goerr.Is(err, seasonpassdomain.ErrTierNotFound):
		return errors.NotFound("TIER_NOT_FOUND", "tier does not exist for this season pass")
	case goerr.Is(err, seasonpassdomain.ErrTierNotReached):
		return errors.BadRequest("TIER_NOT_REACHED", "not enough xp to claim this tier")
	case goerr.Is(err, seasonpassdomain.ErrAlreadyClaimed):
		return errors.Conflict("ALREADY_CLAIMED", "tier reward already claimed")
	case goerr.Is(err, seasonpassdomain.ErrPremiumRequired):
		return errors.Forbidden("PREMIUM_REQUIRED", "purchase the season pass to claim premium rewards")
	case goerr.Is(err, seasonpassdomain.ErrNoRewardOnTrack):
		return errors.BadRequest("NO_REWARD", "no reward on this track for this tier")
	case goerr.Is(err, seasonpassdomain.ErrInvalidTrack):
		return errors.BadRequest("INVALID_TRACK", "track must be FREE or PREMIUM")
	default:
		return errors.InternalServer("INTERNAL", "failed to claim reward")
	}
}
