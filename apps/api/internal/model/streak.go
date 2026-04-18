package model

import "time"

// StreakState is the unified view the client sees: raw counters from the
// profile progress layer plus shield protection state from user_streak_shields.
type StreakState struct {
	CurrentDays       int32      `json:"currentDays"`
	LongestDays       int32      `json:"longestDays"`
	ShieldsOwned      int32      `json:"shieldsOwned"`
	IsBroken          bool       `json:"isBroken"`
	CanRestore        bool       `json:"canRestore"`
	LastActiveAt      *time.Time `json:"lastActiveAt,omitempty"`
	LastShieldUsedAt  *time.Time `json:"lastShieldUsedAt,omitempty"`
	ShieldPriceGold   int32      `json:"shieldPriceGold"`
}
