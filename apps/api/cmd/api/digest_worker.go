package main

import (
	"context"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/jackc/pgx/v5/pgxpool"

	"api/internal/clients/notification"
	"api/internal/clients/notification/notiftext"
)

// startGuildDigestWorker sends weekly guild digests every Monday at ~10:00.
func startGuildDigestWorker(notif notification.Sender, db *pgxpool.Pool) func() error {
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
				sendGuildDigests(ctx, notif, db)
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

func sendGuildDigests(ctx context.Context, notif notification.Sender, db *pgxpool.Pool) {
	// Single query: get guilds with their members in one pass.
	rows, err := db.Query(ctx, `
		SELECT c.id, c.name, c.member_count, cm.user_id::text
		FROM guilds c
		JOIN guild_members cm ON cm.guild_id = c.id
		WHERE c.member_count >= 2
		ORDER BY c.id
		LIMIT 5000
	`)
	if err != nil {
		klog.Errorf("guild digest query: %v", err)
		return
	}
	defer rows.Close()

	type guildDigest struct {
		name      string
		count     int
		memberIDs []string
	}

	guilds := make(map[string]*guildDigest)
	var order []string

	for rows.Next() {
		var guildID, name, memberID string
		var memberCount int
		if err := rows.Scan(&guildID, &name, &memberCount, &memberID); err != nil {
			continue
		}
		cd, ok := guilds[guildID]
		if !ok {
			cd = &guildDigest{name: name, count: memberCount}
			guilds[guildID] = cd
			order = append(order, guildID)
		}
		cd.memberIDs = append(cd.memberIDs, memberID)
	}

	for _, guildID := range order {
		cd := guilds[guildID]
		if len(cd.memberIDs) == 0 {
			continue
		}
		notif.SendBatch(ctx, cd.memberIDs, "guild_weekly_digest",
			notiftext.GuildDigestTitle(),
			notiftext.GuildDigestBody(cd.name, cd.count),
			map[string]any{"guild_id": guildID, "guild_name": cd.name})
	}

	klog.Infof("guild digests sent for %d guilds", len(guilds))
}
