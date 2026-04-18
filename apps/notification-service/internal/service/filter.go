package service

import (
	"time"

	"notification-service/internal/data"
)

const maxDailyNotifications = 2

type FilterResult int

const (
	FilterDeliver    FilterResult = iota
	FilterDrop                    // silently drop
	FilterReschedule              // reschedule to end of quiet hours
)

// ShouldDeliver checks whether a notification should be delivered now.
func ShouldDeliver(n *data.Notification, settings *data.UserSettings, dailyCount int, guildSettings *data.GuildSettings) FilterResult {
	// No Telegram chat linked.
	if settings.TelegramChatID == 0 {
		return FilterDrop
	}

	// Quiet hours — reschedule.
	if isQuietHours(settings) {
		return FilterReschedule
	}

	// Rate limit: max N notifications per day.
	// Guild events (invites, event created) bypass rate limit — they are transactional.
	if !isTransactional(n.Kind) && dailyCount >= maxDailyNotifications {
		return FilterDrop
	}

	// Global category check.
	category := CategoryForKind(n.Kind)
	if !categoryEnabled(category, settings) {
		return FilterDrop
	}

	// Per-guild settings.
	if IsGuildKind(n.Kind) && guildSettings != nil {
		if guildSettings.Muted {
			return FilterDrop
		}
		sub := GuildSubForKind(n.Kind)
		if !guildSubEnabled(sub, guildSettings) {
			return FilterDrop
		}
	}

	// Engagement pause.
	if IsReEngagement(n.Kind) && settings.EngagementPaused {
		return FilterDrop
	}

	return FilterDeliver
}

func isQuietHours(s *data.UserSettings) bool {
	loc, err := time.LoadLocation(s.Timezone)
	if err != nil {
		loc = time.UTC
	}
	hour := time.Now().In(loc).Hour()

	start := s.QuietHoursStart
	end := s.QuietHoursEnd

	if start > end {
		// Overnight: e.g. 23-08 means quiet from 23:00 to 07:59.
		return hour >= start || hour < end
	}
	return hour >= start && hour < end
}

func QuietHoursEndTime(s *data.UserSettings) time.Time {
	loc, err := time.LoadLocation(s.Timezone)
	if err != nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	end := time.Date(now.Year(), now.Month(), now.Day(), s.QuietHoursEnd, 0, 0, 0, loc)
	if end.Before(now) {
		end = end.Add(24 * time.Hour)
	}
	return end.UTC()
}

func categoryEnabled(category string, s *data.UserSettings) bool {
	switch category {
	case CategoryDuels:
		return s.DuelsEnabled
	case CategoryProgress:
		return s.ProgressEnabled
	case CategoryGuilds:
		return s.GuildsEnabled
	case CategoryDailyChallenge:
		return s.DailyChallengeEnabled
	default:
		return true
	}
}

func guildSubEnabled(sub string, s *data.GuildSettings) bool {
	switch sub {
	case GuildSubEvents:
		return s.EventsEnabled
	case GuildSubActivity:
		return s.ActivityEnabled
	case GuildSubDigest:
		return s.DigestEnabled
	default:
		return true
	}
}

// isTransactional returns true for notification kinds that bypass rate limits.
func isTransactional(kind string) bool {
	switch kind {
	case KindDuelInvite, KindDuelMatchFound, KindDuelResult,
		KindGuildInvite, KindGuildEventCreated, KindGuildEventReminder:
		return true
	default:
		return false
	}
}
