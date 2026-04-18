package hub

import (
	"context"
	"fmt"
	"strings"
	"time"

	"api/internal/model"
	v1 "api/pkg/api/hub/v1"

	"github.com/google/uuid"
)

func (i *Implementation) buildPlayer(user *model.User, progress *model.ProfileProgress) *v1.HubPlayer {
	player := &v1.HubPlayer{
		Id:          user.ID.String(),
		DisplayName: resolveDisplayName(user),
	}
	if progress != nil {
		player.LevelLabel = fmt.Sprintf("Level %d", progress.Overview.Level)
		player.StreakDays = progress.Overview.CurrentStreakDays
		player.Title = levelTitle(progress.Overview.Level)
		if n := len(user.PinnedAchievements); n > 0 {
			player.Achievements = &v1.HubAchievements{Unlocked: int32(n)}
		}
	}
	if player.Title == "" && strings.TrimSpace(user.CurrentWorkplace) != "" {
		player.Title = strings.TrimSpace(user.CurrentWorkplace)
	}
	return player
}

func (i *Implementation) mapDailyMissions(src *model.DailyMissionsResponse) []*v1.HubDailyMission {
	if src == nil || len(src.Missions) == 0 {
		return []*v1.HubDailyMission{}
	}

	items := make([]*v1.HubDailyMission, 0, len(src.Missions))
	for _, mission := range src.Missions {
		if mission == nil {
			continue
		}
		items = append(items, &v1.HubDailyMission{
			Key:           mission.Key,
			Title:         mission.Title,
			ProgressLabel: fmt.Sprintf("%d/%d", mission.Current, mission.TargetValue),
			Current:       mission.Current,
			Target:        mission.TargetValue,
			Completed:     mission.Completed,
			RewardLabel:   formatMissionReward(mission.XPReward),
			ActionUrl:     mission.ActionURL,
			Icon:          mission.Icon,
		})
	}
	return items
}

func (i *Implementation) buildQuest(progress *model.ProfileProgress, missions []*v1.HubDailyMission) *v1.HubQuest {
	if progress != nil && len(progress.NextActions) > 0 {
		next := progress.NextActions[0]
		if next != nil {
			return &v1.HubQuest{
				Title:       defaultString(next.Title, "Continue your journey"),
				Description: defaultString(next.Description, "Pick up the next recommended activity."),
				ActionUrl:   defaultString(next.ActionURL, "/training"),
				ActionLabel: "Continue quest",
			}
		}
	}

	for _, mission := range missions {
		if mission.GetCompleted() {
			continue
		}
		progressPct := int32(0)
		if mission.GetTarget() > 0 {
			progressPct = int32(float64(mission.GetCurrent()) / float64(mission.GetTarget()) * 100)
		}
		return &v1.HubQuest{
			Title:       mission.GetTitle(),
			Description: "Keep your daily momentum and collect today's reward.",
			ProgressPct: progressPct,
			ActionUrl:   defaultString(mission.GetActionUrl(), "/training"),
			ActionLabel: "Continue quest",
		}
	}

	return nil
}

func (i *Implementation) loadArenaItems(ctx context.Context) []*v1.HubArenaItem {
	if i.service.arena == nil {
		return []*v1.HubArenaItem{}
	}

	matches, err := i.service.arena.ListOpenMatches(ctx, 3)
	if err == nil && len(matches) > 0 {
		items := make([]*v1.HubArenaItem, 0, len(matches))
		for _, match := range matches {
			if match == nil {
				continue
			}
			items = append(items, &v1.HubArenaItem{
				Label:     arenaMatchLabel(match),
				Meta:      arenaMatchMeta(match),
				ActionUrl: fmt.Sprintf("/arena/%s", match.ID.String()),
			})
		}
		if len(items) > 0 {
			return items
		}
	}

	entries, err := i.service.arena.GetLeaderboard(ctx, 3)
	if err != nil || len(entries) == 0 {
		return []*v1.HubArenaItem{}
	}

	items := make([]*v1.HubArenaItem, 0, len(entries))
	for _, entry := range entries {
		if entry == nil {
			continue
		}
		items = append(items, &v1.HubArenaItem{
			Label:     entry.DisplayName,
			Meta:      fmt.Sprintf("%s · %d rating", entry.League, entry.Rating),
			ActionUrl: "/leaderboards",
		})
	}
	return items
}

func (i *Implementation) loadEvents(ctx context.Context, userID uuid.UUID) []*v1.HubEvent {
	if i.service.events == nil {
		return []*v1.HubEvent{}
	}

	resp, err := i.service.events.ListEvents(ctx, userID, model.ListEventsOptions{Limit: 4})
	if err != nil || resp == nil || len(resp.Events) == 0 {
		return []*v1.HubEvent{}
	}

	items := make([]*v1.HubEvent, 0, len(resp.Events))
	for _, event := range resp.Events {
		if event == nil {
			continue
		}
		item := &v1.HubEvent{
			Id:        event.ID.String(),
			Title:     event.Title,
			Meta:      eventMeta(event),
			ActionUrl: "/events",
		}
		if event.ScheduledAt != nil {
			item.StartsAt = event.ScheduledAt.UTC().Format(time.RFC3339)
		}
		items = append(items, item)
	}
	return items
}

func (i *Implementation) loadGuild(ctx context.Context, userID uuid.UUID) *v1.HubGuild {
	if i.service.guilds == nil {
		return nil
	}

	resp, err := i.service.guilds.ListGuilds(ctx, userID, model.ListGuildsOptions{Limit: 20})
	if err != nil || resp == nil {
		return nil
	}

	var current *model.Guild
	for _, guild := range resp.Guilds {
		if guild != nil && guild.IsJoined {
			current = guild
			break
		}
	}
	if current == nil {
		return nil
	}

	members, err := i.service.guilds.ListGuildMembers(ctx, current.ID, 5)
	if err != nil {
		return &v1.HubGuild{
			Id:            current.ID.String(),
			Name:          current.Name,
			MemberPreview: []string{},
			ActionUrl:     "/guild",
		}
	}

	preview := make([]string, 0, len(members))
	for _, member := range members {
		if member == nil {
			continue
		}
		preview = append(preview, resolveMemberName(member))
	}

	return &v1.HubGuild{
		Id:            current.ID.String(),
		Name:          current.Name,
		MemberPreview: preview,
		ActionUrl:     "/guild",
	}
}

func resolveDisplayName(user *model.User) string {
	if user == nil {
		return "Wanderer"
	}
	if full := strings.TrimSpace(strings.TrimSpace(user.FirstName + " " + user.LastName)); full != "" {
		return full
	}
	if user.Username != "" {
		return user.Username
	}
	if user.TelegramUsername != "" {
		return user.TelegramUsername
	}
	return "Wanderer"
}

func resolveMemberName(member *model.GuildMemberProfile) string {
	if member == nil {
		return "member"
	}
	if full := strings.TrimSpace(strings.TrimSpace(member.FirstName + " " + member.LastName)); full != "" {
		return full
	}
	return "member"
}

func levelTitle(level int32) string {
	switch {
	case level >= 50:
		return "Legend"
	case level >= 35:
		return "Master"
	case level >= 20:
		return "Ranger"
	case level >= 10:
		return "Challenger"
	case level >= 5:
		return "Seeker"
	default:
		return "Initiate"
	}
}

func defaultString(v, fallback string) string {
	if strings.TrimSpace(v) == "" {
		return fallback
	}
	return v
}

func formatMissionReward(xp int32) string {
	if xp <= 0 {
		return ""
	}
	return fmt.Sprintf("+%d XP", xp)
}

func arenaMatchLabel(match *model.ArenaMatch) string {
	if match == nil {
		return "Open match"
	}
	names := make([]string, 0, len(match.Players))
	for _, player := range match.Players {
		if player == nil {
			continue
		}
		names = append(names, player.DisplayName)
	}
	switch len(names) {
	case 0:
		return "Open match"
	case 1:
		return names[0] + " vs challenger"
	default:
		return names[0] + " vs " + names[1]
	}
}

func arenaMatchMeta(match *model.ArenaMatch) string {
	if match == nil {
		return ""
	}
	parts := []string{}
	if d := strings.TrimSpace(match.Difficulty.String()); d != "" {
		parts = append(parts, d)
	}
	if topic := strings.TrimSpace(match.Topic); topic != "" {
		parts = append(parts, topic)
	}
	return strings.Join(parts, " · ")
}

func eventMeta(event *model.Event) string {
	if event == nil {
		return ""
	}
	parts := []string{}
	if place := strings.TrimSpace(event.PlaceLabel); place != "" {
		parts = append(parts, place)
	} else if city := strings.TrimSpace(event.City); city != "" {
		parts = append(parts, city)
	}
	if event.ParticipantCount > 0 {
		parts = append(parts, fmt.Sprintf("%d going", event.ParticipantCount))
	}
	return strings.Join(parts, " · ")
}
