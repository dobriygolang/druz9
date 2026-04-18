package season_pass

import (
	"context"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	seasonpassdomain "api/internal/domain/season_pass"
	"api/internal/model"
	v1 "api/pkg/api/season_pass/v1"
)

type Service interface {
	GetActive(ctx context.Context, userID uuid.UUID) (*model.SeasonPassSnapshot, error)
	ClaimTierReward(ctx context.Context, userID uuid.UUID, tier int32, track model.RewardTrack) (*model.ClaimOutcome, error)
	PurchasePremium(ctx context.Context, userID uuid.UUID) (*model.SeasonPassProgress, error)
}

type Implementation struct {
	v1.UnimplementedSeasonPassServiceServer
	service Service
}

func New(s Service) *Implementation { return &Implementation{service: s} }

func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.SeasonPassService_ServiceDesc
}

func (i *Implementation) GetActive(ctx context.Context, _ *v1.GetActiveRequest) (*v1.GetActiveResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	snap, err := i.service.GetActive(ctx, user.ID)
	if err != nil {
		if goerr.Is(err, seasonpassdomain.ErrNoActivePass) {
			return nil, errors.NotFound("NO_ACTIVE_PASS", "no active season pass")
		}
		return nil, errors.InternalServer("INTERNAL", "failed to load season pass")
	}
	tiers := make([]*v1.SeasonPassTier, 0, len(snap.Tiers))
	for _, t := range snap.Tiers {
		tiers = append(tiers, mapTier(t))
	}
	return &v1.GetActiveResponse{
		Pass:     mapPass(snap.Pass),
		Tiers:    tiers,
		Progress: mapProgress(snap.Progress),
	}, nil
}

func (i *Implementation) ClaimTierReward(ctx context.Context, req *v1.ClaimTierRewardRequest) (*v1.ClaimTierRewardResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
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

func (i *Implementation) PurchasePremium(ctx context.Context, _ *v1.PurchasePremiumRequest) (*v1.PurchasePremiumResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	progress, err := i.service.PurchasePremium(ctx, user.ID)
	if err != nil {
		switch {
		case goerr.Is(err, seasonpassdomain.ErrNoActivePass):
			return nil, errors.NotFound("NO_ACTIVE_PASS", "no active season pass")
		case goerr.Is(err, seasonpassdomain.ErrAlreadyPurchased):
			return nil, errors.Conflict("ALREADY_PURCHASED", "premium already active")
		case goerr.Is(err, seasonpassdomain.ErrInsufficientGems):
			return nil, errors.BadRequest("INSUFFICIENT_GEMS", "not enough gems")
		default:
			return nil, errors.InternalServer("INTERNAL", "failed to purchase premium")
		}
	}
	return &v1.PurchasePremiumResponse{Progress: mapProgress(progress)}, nil
}

// ---------- helpers ----------

func mapPass(p *model.SeasonPass) *v1.SeasonPass {
	if p == nil {
		return nil
	}
	return &v1.SeasonPass{
		Id:               p.ID.String(),
		SeasonNumber:     p.SeasonNumber,
		Title:            p.Title,
		Subtitle:         p.Subtitle,
		StartsAt:         timestamppb.New(p.StartsAt),
		EndsAt:           timestamppb.New(p.EndsAt),
		MaxTier:          p.MaxTier,
		XpPerTier:        p.XPPerTier,
		PremiumPriceGems: p.PremiumPriceGems,
	}
}

func mapTier(t *model.SeasonPassTier) *v1.SeasonPassTier {
	if t == nil {
		return nil
	}
	return &v1.SeasonPassTier{
		Tier:                 t.Tier,
		FreeRewardKind:       v1.RewardKind(t.FreeRewardKind),
		FreeRewardAmount:     t.FreeRewardAmount,
		FreeRewardLabel:      t.FreeRewardLabel,
		PremiumRewardKind:    v1.RewardKind(t.PremiumRewardKind),
		PremiumRewardAmount:  t.PremiumRewardAmount,
		PremiumRewardLabel:   t.PremiumRewardLabel,
	}
}

func mapProgress(p *model.SeasonPassProgress) *v1.SeasonPassProgress {
	if p == nil {
		return nil
	}
	return &v1.SeasonPassProgress{
		Xp:             p.XP,
		CurrentTier:    p.CurrentTier,
		HasPremium:     p.HasPremium,
		ClaimedFree:    p.ClaimedFree,
		ClaimedPremium: p.ClaimedPremium,
	}
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
