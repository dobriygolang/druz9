package main

import (
	"api/internal/clients/notification"
	"context"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/jackc/pgx/v5/pgxpool"
)

// startStreakWarningWorker runs a periodic check (every hour) for users whose streaks
// are about to expire. Sends streak_warning notifications.
func startStreakWarningWorker(notif notification.Sender, db *pgxpool.Pool) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		// Wait 5 minutes after startup before first check.
		select {
		case <-ctx.Done():
			return
		case <-time.After(5 * time.Minute):
		}

		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		sendStreakWarnings(ctx, notif, db)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
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
	// Find users with consecutive activity streaks >= 3 who are missing today's activity.
	// Uses the same tables the progress system reads from.
	rows, err := db.Query(ctx, `
		WITH recent_activity AS (
			SELECT user_id, DATE(started_at AT TIME ZONE 'UTC') AS d
			FROM interview_prep_mock_sessions WHERE status = 'finished'
			  AND started_at >= CURRENT_DATE - INTERVAL '90 days'
			UNION
			SELECT user_id, DATE(created_at AT TIME ZONE 'UTC') AS d
			FROM interview_prep_sessions WHERE status = 'finished'
			  AND created_at >= CURRENT_DATE - INTERVAL '90 days'
		),
		unique_days AS (
			SELECT DISTINCT user_id, d FROM recent_activity
		),
		yesterday_active AS (
			SELECT user_id FROM unique_days WHERE d = CURRENT_DATE - 1
		),
		today_active AS (
			SELECT user_id FROM unique_days WHERE d = CURRENT_DATE
		)
		SELECT ya.user_id
		FROM yesterday_active ya
		WHERE ya.user_id NOT IN (SELECT user_id FROM today_active)
		LIMIT 200
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
		body := "Твой streak под угрозой!\nЗаверши хотя бы одну задачу сегодня, чтобы сохранить его."
		notif.Send(ctx, userID, "streak_warning", "Streak под угрозой", body, map[string]any{})
		count++
	}
	if count > 0 {
		klog.Infof("streak warnings sent: %d", count)
	}
}
