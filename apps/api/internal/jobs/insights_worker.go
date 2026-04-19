package jobs

import (
	"context"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"

	insightsapp "api/internal/app/insights"
	insightsdata "api/internal/data/insights"
	profiledata "api/internal/data/profile"
)

// startInsightsCronWorker refreshes ADR-002 insights for active users
// once every six hours. The deterministic generator is cheap (a single
// progress query per user) so the cap is mostly to avoid burning DB IO
// during peak hours; an LLM-backed generator will need a tighter limiter.
func StartInsightsCron(profileRepo *profiledata.Repo, insightsRepo *insightsdata.Repo) func() error {
	ctx, cancel := context.WithCancel(context.Background())
	svc := insightsapp.New(profileRepo, insightsRepo)

	const (
		tickInterval   = 6 * time.Hour
		activeWindow   = 7 * 24 * time.Hour
		userBatchLimit = 500 // safety cap per tick — bump when LLM is wired
	)

	go func() {
		// Wait one tick before the first run so a redeploy doesn't slam
		// the DB with an unscheduled refresh storm.
		timer := time.NewTimer(tickInterval)
		defer timer.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-timer.C:
				runInsightsTick(context.Background(), svc, profileRepo, insightsRepo, time.Now().UTC().Add(-activeWindow), userBatchLimit)
				timer.Reset(tickInterval)
			}
		}
	}()

	return func() error {
		cancel()
		return nil
	}
}

func runInsightsTick(
	ctx context.Context,
	svc *insightsapp.Service,
	profileRepo *profiledata.Repo,
	insightsRepo *insightsdata.Repo,
	activeSince time.Time,
	limit int,
) {
	users, err := profileRepo.ListActiveUserIDs(ctx, activeSince, limit)
	if err != nil {
		klog.Errorf("insights cron: list active users: %v", err)
		return
	}
	if len(users) == 0 {
		return
	}
	refreshed := 0
	for _, uid := range users {
		fresh, err := svc.Generate(ctx, uid)
		if err != nil {
			klog.Warnf("insights cron: generate user=%s: %v", uid, err)
			continue
		}
		if err := insightsRepo.Upsert(ctx, fresh); err != nil {
			klog.Warnf("insights cron: persist user=%s: %v", uid, err)
			continue
		}
		refreshed++
	}
	klog.Infof("insights cron: refreshed %d/%d active users", refreshed, len(users))
}
