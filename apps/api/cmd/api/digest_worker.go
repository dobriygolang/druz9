package main

import (
	"api/internal/clients/notification"
	"api/internal/notiftext"
	"context"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/jackc/pgx/v5/pgxpool"
)

// startCircleDigestWorker sends weekly circle digests every Monday at ~10:00.
func startCircleDigestWorker(notif notification.Sender, db *pgxpool.Pool) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		for {
			now := time.Now()
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
	// Single query: get circles with their members in one pass.
	rows, err := db.Query(ctx, `
		SELECT c.id, c.name, c.member_count, cm.user_id::text
		FROM circles c
		JOIN circle_members cm ON cm.circle_id = c.id
		WHERE c.member_count >= 2
		ORDER BY c.id
		LIMIT 5000
	`)
	if err != nil {
		klog.Errorf("circle digest query: %v", err)
		return
	}
	defer rows.Close()

	type circleDigest struct {
		name      string
		count     int
		memberIDs []string
	}

	circles := make(map[string]*circleDigest)
	var order []string

	for rows.Next() {
		var circleID, name, memberID string
		var memberCount int
		if err := rows.Scan(&circleID, &name, &memberCount, &memberID); err != nil {
			continue
		}
		cd, ok := circles[circleID]
		if !ok {
			cd = &circleDigest{name: name, count: memberCount}
			circles[circleID] = cd
			order = append(order, circleID)
		}
		cd.memberIDs = append(cd.memberIDs, memberID)
	}

	for _, circleID := range order {
		cd := circles[circleID]
		if len(cd.memberIDs) == 0 {
			continue
		}
		notif.SendBatch(ctx, cd.memberIDs, "circle_weekly_digest",
			notiftext.CircleDigestTitle(),
			notiftext.CircleDigestBody(cd.name, cd.count),
			map[string]any{"circle_id": circleID, "circle_name": cd.name})
	}

	klog.Infof("circle digests sent for %d circles", len(circles))
}
