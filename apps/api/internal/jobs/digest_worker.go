package jobs

import (
	"context"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/clients/notification"
	"api/internal/clients/notification/notiftext"
	guilddata "api/internal/data/guild"
)

// startGuildDigestWorker sends weekly guild digests every Monday at ~10:00.
func StartGuildDigest(notif notification.Sender, repo *guilddata.Repo) func() error {
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
				sendGuildDigests(ctx, notif, repo)
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

func sendGuildDigests(ctx context.Context, notif notification.Sender, repo *guilddata.Repo) {
	guilds, err := repo.ListDigestGuilds(ctx, 5000)
	if err != nil {
		klog.Errorf("guild digest query: %v", err)
		return
	}

	for _, guild := range guilds {
		if len(guild.MemberIDs) == 0 {
			continue
		}
		notif.SendBatch(ctx, guild.MemberIDs, "guild_weekly_digest",
			notiftext.GuildDigestTitle(),
			notiftext.GuildDigestBody(guild.Name, guild.Count),
			map[string]any{"guild_id": guild.ID, "guild_name": guild.Name})
	}

	klog.Infof("guild digests sent for %d guilds", len(guilds))
}
