package streak

import (
	"context"
	"time"

	"github.com/google/uuid"

	profiledata "api/internal/data/profile"
	streakdomain "api/internal/domain/streak"
)

// StatsAdapter wires profile.Repo.GetStreakStats into the streak domain.
type StatsAdapter struct {
	profileRepo *profiledata.Repo
}

func NewStatsAdapter(profileRepo *profiledata.Repo) *StatsAdapter {
	return &StatsAdapter{profileRepo: profileRepo}
}

var _ streakdomain.StreakStatsProvider = (*StatsAdapter)(nil)

func (a *StatsAdapter) GetStreakStats(ctx context.Context, userID uuid.UUID) (streakdomain.StreakStats, error) {
	current, longest, lastActive, err := a.profileRepo.GetStreakStats(ctx, userID, time.Now().UTC())
	if err != nil {
		return streakdomain.StreakStats{}, err
	}
	return streakdomain.StreakStats{
		CurrentDays:  current,
		LongestDays:  longest,
		LastActiveAt: lastActive,
	}, nil
}
