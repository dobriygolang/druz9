package main

import (
	"context"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"

	guilddata "api/internal/data/guild"
)

// defaultWarFrontNames are the five contested zones seeded for every new war.
var defaultWarFrontNames = []string{
	"Graphs Bastion",
	"Systems Tower",
	"DP Canyon",
	"String Bridge",
	"Algo Plaza",
}

// startGuildWarCronWorker schedules weekly Guild War phase transitions:
//
//	Monday    06:00 UTC — resolve stale wars, pair guilds, create draft wars
//	Wednesday 06:00 UTC — draft → active (fronts open for contributions)
//	Saturday  06:00 UTC — active → champions_duel
//	Sunday    21:00 UTC — champions_duel → resolved + award territories
func startGuildWarCronWorker(warRepo *guilddata.Repo) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		for {
			now := time.Now().UTC()
			next := nextGuildWarTick(now)

			select {
			case <-ctx.Done():
				return
			case <-time.After(time.Until(next)):
				runGuildWarTick(context.Background(), warRepo, time.Now().UTC())
			}
		}
	}()

	return func() error {
		cancel()
		return nil
	}
}

// nextGuildWarTick returns the next scheduled tick from now.
// Ticks fire on Mon/Wed/Sat at 06:00 UTC and Sun at 21:00 UTC.
func nextGuildWarTick(now time.Time) time.Time {
	candidates := []time.Time{
		nextWeekdayAt(now, time.Monday, 6, 0),
		nextWeekdayAt(now, time.Wednesday, 6, 0),
		nextWeekdayAt(now, time.Saturday, 6, 0),
		nextWeekdayAt(now, time.Sunday, 21, 0),
	}
	earliest := candidates[0]
	for _, c := range candidates[1:] {
		if c.Before(earliest) {
			earliest = c
		}
	}
	return earliest
}

// nextWeekdayAt returns the next occurrence of the given weekday and time,
// always strictly in the future (at least 1 minute from now).
func nextWeekdayAt(now time.Time, weekday time.Weekday, hour, minute int) time.Time {
	days := int(weekday) - int(now.Weekday())
	if days < 0 {
		days += 7
	}
	candidate := time.Date(now.Year(), now.Month(), now.Day()+days, hour, minute, 0, 0, time.UTC)
	if !candidate.After(now.Add(time.Minute)) {
		candidate = candidate.Add(7 * 24 * time.Hour)
	}
	return candidate
}

// runGuildWarTick fires the right action based on the current UTC weekday.
func runGuildWarTick(ctx context.Context, warRepo *guilddata.Repo, now time.Time) {
	switch now.Weekday() {
	case time.Monday:
		runMondaySetup(ctx, warRepo, now)
	case time.Wednesday:
		runPhaseTransition(ctx, warRepo, "draft", "active")
	case time.Saturday:
		runPhaseTransition(ctx, warRepo, "active", "champions_duel")
	case time.Sunday:
		runSundayResolution(ctx, warRepo)
	}
}

// runMondaySetup cleans up expired wars and drafts the next week's matchups.
func runMondaySetup(ctx context.Context, warRepo *guilddata.Repo, now time.Time) {
	stale, err := warRepo.MarkStaleWarsResolved(ctx)
	if err != nil {
		klog.Errorf("guild_war cron: mark stale resolved: %v", err)
	} else if stale > 0 {
		klog.Infof("guild_war cron: marked %d stale wars resolved", stale)
	}

	guilds, err := warRepo.ListGuildsForWarPairing(ctx)
	if err != nil {
		klog.Errorf("guild_war cron: list guilds: %v", err)
		return
	}
	if len(guilds) == 0 {
		klog.Infof("guild_war cron: no guilds to pair")
		return
	}

	_, isoWeek := now.ISOWeek()
	weekNumber := int32(isoWeek)
	pairs := pairGuilds(guilds, weekNumber)
	created := 0
	for _, pair := range pairs {
		if err := warRepo.CreateDraftWar(ctx, pair, defaultWarFrontNames, 7*24*time.Hour); err != nil {
			klog.Errorf("guild_war cron: create draft war guild=%s: %v", pair.GuildAID, err)
			continue
		}
		created++
	}
	klog.Infof("guild_war cron: Monday setup — %d pairs drafted (week %d)", created, weekNumber)
}

// pairGuilds pairs guilds consecutively by member count (already sorted DESC).
// For an odd guild count the last guild gets a placeholder "Rival Alliance" opponent.
func pairGuilds(guilds []guilddata.GuildSeed, weekNumber int32) []guilddata.WarPair {
	pairs := make([]guilddata.WarPair, 0, (len(guilds)+1)/2)
	for i := 0; i+1 < len(guilds); i += 2 {
		a, b := guilds[i], guilds[i+1]
		bID := b.ID
		pairs = append(pairs, guilddata.WarPair{
			GuildAID:   a.ID,
			GuildAName: a.Name,
			GuildBID:   &bID,
			GuildBName: b.Name,
			WeekNumber: weekNumber,
		})
	}
	if len(guilds)%2 == 1 {
		last := guilds[len(guilds)-1]
		pairs = append(pairs, guilddata.WarPair{
			GuildAID:   last.ID,
			GuildAName: last.Name,
			GuildBID:   nil,
			GuildBName: "Rival Alliance",
			WeekNumber: weekNumber,
		})
	}
	return pairs
}

func runPhaseTransition(ctx context.Context, warRepo *guilddata.Repo, from, to string) {
	n, err := warRepo.TransitionWarPhase(ctx, from, to)
	if err != nil {
		klog.Errorf("guild_war cron: transition %s→%s: %v", from, to, err)
		return
	}
	klog.Infof("guild_war cron: %s→%s transitioned %d wars", from, to, n)
}

func runSundayResolution(ctx context.Context, warRepo *guilddata.Repo) {
	n, err := warRepo.ResolveWarsAndAwardTerritories(ctx)
	if err != nil {
		klog.Errorf("guild_war cron: sunday resolution: %v", err)
		return
	}
	klog.Infof("guild_war cron: Sunday resolution — %d wars resolved, territories awarded", n)
}
