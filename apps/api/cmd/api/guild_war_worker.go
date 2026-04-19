package main

import (
	"context"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"

	eventdata "api/internal/data/event"
	guilddata "api/internal/data/guild"
	guildwarrt "api/internal/realtime/guildwar"
)

// defaultWarFrontNames are the five contested zones seeded for every new war.
var defaultWarFrontNames = []string{
	"Graphs Bastion",
	"Systems Tower",
	"DP Canyon",
	"String Bridge",
	"Algo Plaza",
}

// notifyDeps groups optional fan-out dependencies. When all are non-nil
// the cron pushes a system event into each affected guild's feed and a
// websocket message into the live war hub. Pass nils in tests to keep
// the worker side-effect free.
type notifyDeps struct {
	events *eventdata.Repo
	hub    *guildwarrt.Hub
}

// startGuildWarCronWorker schedules weekly Guild War phase transitions:
//
//	Monday    06:00 UTC — resolve stale wars, pair guilds, create draft wars
//	Wednesday 06:00 UTC — draft → active (fronts open for contributions)
//	Saturday  06:00 UTC — active → champions_duel
//	Sunday    21:00 UTC — champions_duel → resolved + award territories
func startGuildWarCronWorker(warRepo *guilddata.Repo, notify notifyDeps) func() error {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		for {
			now := time.Now().UTC()
			next := nextGuildWarTick(now)

			select {
			case <-ctx.Done():
				return
			case <-time.After(time.Until(next)):
				runGuildWarTick(context.Background(), warRepo, notify, time.Now().UTC())
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
func runGuildWarTick(ctx context.Context, warRepo *guilddata.Repo, notify notifyDeps, now time.Time) {
	switch now.Weekday() {
	case time.Monday:
		runMondaySetup(ctx, warRepo, now)
	case time.Wednesday:
		runPhaseTransition(ctx, warRepo, notify, "draft", "active")
	case time.Saturday:
		runPhaseTransition(ctx, warRepo, notify, "active", "champions_duel")
	case time.Sunday:
		runSundayResolution(ctx, warRepo, notify)
	case time.Tuesday, time.Thursday, time.Friday:
		return
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

func runPhaseTransition(ctx context.Context, warRepo *guilddata.Repo, notify notifyDeps, from, to string) {
	n, err := warRepo.TransitionWarPhase(ctx, from, to)
	if err != nil {
		klog.Errorf("guild_war cron: transition %s→%s: %v", from, to, err)
		return
	}
	klog.Infof("guild_war cron: %s→%s transitioned %d wars", from, to, n)
	fanOutPhaseTransition(ctx, warRepo, notify, to)
}

func runSundayResolution(ctx context.Context, warRepo *guilddata.Repo, notify notifyDeps) {
	// Snapshot wars *before* resolving so we can fan-out the resolved event
	// with the right guild list.
	wars, _ := warRepo.ListWarsInPhase(ctx, "champions_duel")
	n, err := warRepo.ResolveWarsAndAwardTerritories(ctx)
	if err != nil {
		klog.Errorf("guild_war cron: sunday resolution: %v", err)
		return
	}
	klog.Infof("guild_war cron: Sunday resolution — %d wars resolved, territories awarded", n)
	fanOutSummary(ctx, warRepo, notify, wars, "guild_war_resolved", "Война гильдии завершена")
}

// fanOutPhaseTransition pushes a system event + WS message for every war
// that just entered `phase`. Both side-effects are best-effort: errors
// are logged but never block the cron tick.
func fanOutPhaseTransition(ctx context.Context, warRepo *guilddata.Repo, notify notifyDeps, phase string) {
	if notify.events == nil && notify.hub == nil {
		return
	}
	wars, err := warRepo.ListWarsInPhase(ctx, phase)
	if err != nil {
		klog.Warnf("guild_war cron: list wars in %s: %v", phase, err)
		return
	}
	title := "Война гильдии: фаза " + phase
	fanOutSummary(ctx, warRepo, notify, wars, "guild_war_phase", title)
}

func fanOutSummary(ctx context.Context, warRepo *guilddata.Repo, notify notifyDeps, wars []guilddata.WarSummary, kind, title string) {
	for _, w := range wars {
		// Push to both sides of the matchup.
		guildIDs := []*[16]byte{}
		_ = guildIDs // silence linter; actual IDs handled below
		emitFor := func(gid [16]byte) {
			if notify.events != nil {
				creator, err := warRepo.GetGuildCreator(ctx, gid)
				if err == nil {
					_ = notify.events.InsertSystemEvent(ctx, gid, creator, eventdata.SystemKind(kind), title, time.Now().UTC())
				}
			}
			if notify.hub != nil {
				notify.hub.Publish(guildwarrt.Event{
					Type:  kind,
					WarID: w.WarID,
					Data: map[string]any{
						"guildId": gid,
						"phase":   w.Phase,
					},
				})
			}
		}
		emitFor(w.OurGuildID)
		if w.TheirGuildID != nil {
			emitFor(*w.TheirGuildID)
		}
	}
}
