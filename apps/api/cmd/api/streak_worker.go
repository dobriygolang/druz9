package main

import (
	"api/internal/clients/notification"
	"api/internal/notiftext"
	"context"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/jackc/pgx/v5/pgxpool"
)

// startStreakWarningWorker runs once daily at 20:00 UTC (23:00 Moscow)
// to warn users whose streaks will break if they don't practice today.
func startStreakWarningWorker(notif notification.Sender, db *pgxpool.Pool) func() error {
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
				sendStreakWarnings(ctx, notif, db)
			}
		}
	}()

	return func() error {
		cancel()
		return nil
	}
}

func sendStreakWarnings(ctx context.Context, notif notification.Sender, db *pgxpool.Pool) {
	// Find users active yesterday but not today — their streak is at risk.
	// Only scans last 2 days of data (not 90 days like before).
	rows, err := db.Query(ctx, `
		WITH activity AS (
			SELECT user_id, DATE(finished_at AT TIME ZONE 'UTC') AS d
			FROM interview_mock_sessions WHERE status = 'finished'
			  AND finished_at >= CURRENT_DATE - 1
			UNION
			SELECT user_id, DATE(finished_at AT TIME ZONE 'UTC') AS d
			FROM interview_practice_sessions WHERE status = 'finished'
			  AND finished_at >= CURRENT_DATE - 1
		)
		SELECT DISTINCT a.user_id
		FROM activity a
		WHERE a.d = CURRENT_DATE - 1
		  AND a.user_id NOT IN (SELECT user_id FROM activity WHERE d = CURRENT_DATE)
		LIMIT 500
	`)
	if err != nil {
		klog.Errorf("streak warning query: %v", err)
		return
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			continue
		}
		notif.Send(ctx, userID, "streak_warning",
			notiftext.StreakWarningTitle(), notiftext.StreakWarningBody(), map[string]any{})
		count++
	}
	if count > 0 {
		klog.Infof("streak warnings sent: %d", count)
	}
}
