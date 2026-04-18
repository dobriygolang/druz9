package streak

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/model"
	v1 "api/pkg/api/streak/v1"
)

func mapState(s *model.StreakState) *v1.StreakState {
	if s == nil {
		return nil
	}
	out := &v1.StreakState{
		CurrentDays:     s.CurrentDays,
		LongestDays:     s.LongestDays,
		ShieldsOwned:    s.ShieldsOwned,
		IsBroken:        s.IsBroken,
		CanRestore:      s.CanRestore,
		ShieldPriceGold: s.ShieldPriceGold,
	}
	if s.LastActiveAt != nil {
		out.LastActiveAt = timestamppb.New(*s.LastActiveAt)
	}
	if s.LastShieldUsedAt != nil {
		out.LastShieldUsedAt = timestamppb.New(*s.LastShieldUsedAt)
	}
	return out
}
