package model

import (
	"time"

	"github.com/google/uuid"
)

// RewardKind mirrors the proto enum.
type RewardKind int32

const (
	RewardKindUnspecified RewardKind = 0
	RewardKindGold        RewardKind = 1
	RewardKindGems        RewardKind = 2
	RewardKindXP          RewardKind = 3
	RewardKindFrame       RewardKind = 4
	RewardKindPet         RewardKind = 5
	RewardKindEmote       RewardKind = 6
	RewardKindBanner      RewardKind = 7
	RewardKindAura        RewardKind = 8
	RewardKindCosmetic    RewardKind = 9
)

// RewardTrack distinguishes free from premium reward tracks.
type RewardTrack int32

const (
	RewardTrackUnspecified RewardTrack = 0
	RewardTrackFree        RewardTrack = 1
	RewardTrackPremium     RewardTrack = 2
)

// SeasonPass is the definition of a season's reward ladder.
type SeasonPass struct {
	ID               uuid.UUID `json:"id"`
	SeasonNumber     int32     `json:"seasonNumber"`
	Title            string    `json:"title"`
	Subtitle         string    `json:"subtitle"`
	StartsAt         time.Time `json:"startsAt"`
	EndsAt           time.Time `json:"endsAt"`
	MaxTier          int32     `json:"maxTier"`
	XPPerTier        int32     `json:"xpPerTier"`
	PremiumPriceGems int32     `json:"premiumPriceGems"`
}

// SeasonPassTier is one row on the reward ladder.
type SeasonPassTier struct {
	Tier                 int32      `json:"tier"`
	FreeRewardKind       RewardKind `json:"freeRewardKind"`
	FreeRewardAmount     int32      `json:"freeRewardAmount"`
	FreeRewardLabel      string     `json:"freeRewardLabel"`
	PremiumRewardKind    RewardKind `json:"premiumRewardKind"`
	PremiumRewardAmount  int32      `json:"premiumRewardAmount"`
	PremiumRewardLabel   string     `json:"premiumRewardLabel"`
}

// SeasonPassProgress is a user's progress against a season pass.
type SeasonPassProgress struct {
	XP             int32   `json:"xp"`
	CurrentTier    int32   `json:"currentTier"`
	HasPremium     bool    `json:"hasPremium"`
	ClaimedFree    []int32 `json:"claimedFree"`
	ClaimedPremium []int32 `json:"claimedPremium"`
}

// SeasonPassSnapshot bundles pass + ladder + user progress for GetActive.
type SeasonPassSnapshot struct {
	Pass     *SeasonPass          `json:"pass"`
	Tiers    []*SeasonPassTier    `json:"tiers"`
	Progress *SeasonPassProgress  `json:"progress"`
}

// ClaimOutcome is returned from ClaimTierReward.
type ClaimOutcome struct {
	Progress *SeasonPassProgress `json:"progress"`
	Kind     RewardKind          `json:"kind"`
	Amount   int32               `json:"amount"`
	Label    string              `json:"label"`
}
