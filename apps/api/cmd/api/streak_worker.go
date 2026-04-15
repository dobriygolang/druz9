package main

import (
	"context"
	"time"

	"api/internal/notification"

	klog "github.com/go-kratos/kratos/v2/log"
)

// startStreakWarningWorker runs a periodic check for users whose streaks are about to expire.
// Checks every hour; sends streak_warning to users with streak >= 3 who haven't been active today.
func startStreakWarningWorker(notif notification.Sender, storage *storageContext) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				sendStreakWarnings(ctx, notif, storage)
			}
		}
	}()

	return func() error {
		cancel()
		return nil
	}
}

func sendStreakWarnings(ctx context.Context, notif notification.Sender, storage *storageContext) {
	// Query users who have streaks >= 3 but haven't been active today.
	rows, err := storage.store.DB().Query(ctx, `
		WITH user_activity AS (
			SELECT DISTINCT user_id, DATE(created_at AT TIME ZONE 'UTC') AS activity_date
			FROM (
				SELECT user_id, created_at FROM interview_prep_mock_sessions WHERE status = 'finished'
				UNION ALL
				SELECT user_id, created_at FROM interview_prep_sessions WHERE status = 'finished'
			) all_activity
		),
		streaks AS (
			SELECT user_id, COUNT(*) AS streak_days
			FROM (
				SELECT user_id, activity_date,
					   activity_date - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY activity_date)::int AS grp
				FROM user_activity
				WHERE activity_date >= CURRENT_DATE - INTERVAL '60 days'
			) grouped
			WHERE grp = (
				SELECT activity_date - ROW_NUMBER() OVER (ORDER BY activity_date)::int
				FROM user_activity ua2
				WHERE ua2.user_id = grouped.user_id
				ORDER BY activity_date DESC
				LIMIT 1
			)
			GROUP BY user_id, grp
			HAVING COUNT(*) >= 3
		)
		SELECT s.user_id, s.streak_days
		FROM streaks s
		WHERE NOT EXISTS (
			SELECT 1 FROM user_activity ua
			WHERE ua.user_id = s.user_id AND ua.activity_date = CURRENT_DATE
		)
		LIMIT 100
	`)
	if err != nil {
		klog.Errorf("streak warning query: %v", err)
		return
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var userID string
		var streakDays int
		if err := rows.Scan(&userID, &streakDays); err != nil {
			continue
		}
		body := fmt.Sprintf("Твой streak %d дней сгорает сегодня!\nЗаверши хотя бы одну задачу, чтобы сохранить его.", streakDays)
		notif.Send(ctx, userID, "streak_warning", "Streak под угрозой", body, map[string]any{
			"streak_days": streakDays,
		})
		count++
	}
	if count > 0 {
		klog.Infof("streak warnings sent: %d", count)
	}
}
