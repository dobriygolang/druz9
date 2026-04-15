package notification

import v1 "api/pkg/api/notification/v1"

var kindToProto = map[string]v1.NotificationKind{
	"duel_invite":                v1.NotificationKind_NOTIFICATION_KIND_DUEL_INVITE,
	"duel_match_found":           v1.NotificationKind_NOTIFICATION_KIND_DUEL_MATCH_FOUND,
	"duel_result":                v1.NotificationKind_NOTIFICATION_KIND_DUEL_RESULT,
	"duel_win_streak":            v1.NotificationKind_NOTIFICATION_KIND_DUEL_WIN_STREAK,
	"streak_warning":             v1.NotificationKind_NOTIFICATION_KIND_STREAK_WARNING,
	"streak_milestone":           v1.NotificationKind_NOTIFICATION_KIND_STREAK_MILESTONE,
	"rating_milestone":           v1.NotificationKind_NOTIFICATION_KIND_RATING_MILESTONE,
	"mock_result":                v1.NotificationKind_NOTIFICATION_KIND_MOCK_RESULT,
	"review_ready":               v1.NotificationKind_NOTIFICATION_KIND_REVIEW_READY,
	"circle_event_created":       v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_EVENT_CREATED,
	"circle_event_reminder":      v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_EVENT_REMINDER,
	"circle_invite":              v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_INVITE,
	"circle_challenge_completed": v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_CHALLENGE_COMPLETED,
	"circle_member_joined":       v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_MEMBER_JOINED,
	"circle_challenge_progress":  v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_CHALLENGE_PROGRESS,
	"circle_weekly_digest":       v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_WEEKLY_DIGEST,
	"daily_challenge":            v1.NotificationKind_NOTIFICATION_KIND_DAILY_CHALLENGE,
	"re_engagement_circle":       v1.NotificationKind_NOTIFICATION_KIND_RE_ENGAGEMENT_CIRCLE,
	"re_engagement_personal":     v1.NotificationKind_NOTIFICATION_KIND_RE_ENGAGEMENT_PERSONAL,
}

func protoNotificationKind(kind string) (v1.NotificationKind, bool) {
	value, ok := kindToProto[kind]
	return value, ok
}
