package jobs

import (
	"context"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/clients/notification"
	"api/internal/clients/notification/notiftext"
	streakdata "api/internal/data/streak"
)

// startStreakWarningWorker runs once daily at 20:00 UTC (23:00 Moscow)
// to warn users whose streaks will break if they don't practice today.
func StartStreakWarning(notif notification.Sender, repo *streakdata.Repo) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		for {
			now := time.Now().UTC()
			// Next 20:00 UTC.
			next := time.Date(now.Year(), now.Month(), now.Day(), 20, 0, 0, 0, time.UTC)
			if !next.After(now) {
				next = next.Add(24 * time.Hour)
			}

			select {
			case <-ctx.Done():
				return
			case <-time.After(time.Until(next)):
				sendStreakWarnings(ctx, notif, repo)
			}
		}
	}()

	return func() error {
		cancel()
		return nil
	}
}

func sendStreakWarnings(ctx context.Context, notif notification.Sender, repo *streakdata.Repo) {
	userIDs, err := repo.ListWarningUserIDs(ctx, 500)
	if err != nil {
		klog.Errorf("streak warning query: %v", err)
		return
	}

	count := 0
	for _, userID := range userIDs {
		notif.Send(ctx, userID, "streak_warning",
			notiftext.StreakWarningTitle(), notiftext.StreakWarningBody(), map[string]any{})
		count++
	}
	if count > 0 {
		klog.Infof("streak warnings sent: %d", count)
	}
}
