package main

import (
	"context"
	"fmt"
	"time"

	"api/internal/notification"

	"github.com/jackc/pgx/v5/pgxpool"
	klog "github.com/go-kratos/kratos/v2/log"
)

// startCircleDigestWorker sends weekly circle digests every Monday at ~10:00.
func startCircleDigestWorker(notif notification.Sender, db *pgxpool.Pool) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		for {
			now := time.Now()
			// Wait until next Monday 10:00 UTC.
			next := nextMonday(now).Add(10 * time.Hour)
			if next.Before(now) {
				next = next.Add(7 * 24 * time.Hour)
			}
			waitDuration := time.Until(next)

			select {
			case <-ctx.Done():
				return
			case <-time.After(waitDuration):
				sendCircleDigests(ctx, notif, db)
			}
		}
	}()

	return func() error {
		cancel()
		return nil
	}
}

func nextMonday(t time.Time) time.Time {
	daysUntilMonday := (8 - int(t.Weekday())) % 7
	if daysUntilMonday == 0 {
		daysUntilMonday = 7
	}
	return time.Date(t.Year(), t.Month(), t.Day()+daysUntilMonday, 0, 0, 0, 0, t.Location())
}

func sendCircleDigests(ctx context.Context, notif notification.Sender, db *pgxpool.Pool) {
	// Get all circles with their member counts and weekly activity.
	rows, err := db.Query(ctx, `
		SELECT c.id, c.name,
			(SELECT COUNT(*) FROM circle_members cm WHERE cm.circle_id = c.id) AS member_count
		FROM circles c
		WHERE c.is_public = true OR (SELECT COUNT(*) FROM circle_members cm WHERE cm.circle_id = c.id) >= 2
		LIMIT 100
	`)
	if err != nil {
		klog.Errorf("circle digest query: %v", err)
		return
	}
	defer rows.Close()

	type circleInfo struct {
		id          string
		name        string
		memberCount int
	}
	var circles []circleInfo
	for rows.Next() {
		var c circleInfo
		if err := rows.Scan(&c.id, &c.name, &c.memberCount); err != nil {
			continue
		}
		circles = append(circles, c)
	}

	for _, c := range circles {
		// Get members of this circle.
		memberRows, err := db.Query(ctx, `
			SELECT cm.user_id FROM circle_members cm WHERE cm.circle_id = $1`, c.id)
		if err != nil {
			continue
		}

		var memberIDs []string
		for memberRows.Next() {
			var uid string
			if err := memberRows.Scan(&uid); err == nil {
				memberIDs = append(memberIDs, uid)
			}
		}
		memberRows.Close()

		if len(memberIDs) == 0 {
			continue
		}

		body := fmt.Sprintf("📊 Круг \"%s\" — итоги недели\n👥 Участников: %d", c.name, c.memberCount)
		notif.SendBatch(ctx, memberIDs, "circle_weekly_digest", "Недельный digest", body, map[string]any{
			"circle_id": c.id,
			"circle_name": c.name,
		})
	}

	klog.Infof("circle digests sent for %d circles", len(circles))
}
