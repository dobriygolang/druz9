package season_pass

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/model"
	v1 "api/pkg/api/season_pass/v1"
)

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
		Tier:                t.Tier,
		FreeRewardKind:      v1.RewardKind(t.FreeRewardKind),
		FreeRewardAmount:    t.FreeRewardAmount,
		FreeRewardLabel:     t.FreeRewardLabel,
		PremiumRewardKind:   v1.RewardKind(t.PremiumRewardKind),
		PremiumRewardAmount: t.PremiumRewardAmount,
		PremiumRewardLabel:  t.PremiumRewardLabel,
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
