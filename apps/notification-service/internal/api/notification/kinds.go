package notification

import (
	"notification-service/internal/service"
	v1 "notification-service/pkg/notification/v1"
)

var protoToKind = map[v1.NotificationKind]string{
	v1.NotificationKind_NOTIFICATION_KIND_DUEL_INVITE:                service.KindDuelInvite,
	v1.NotificationKind_NOTIFICATION_KIND_DUEL_MATCH_FOUND:           service.KindDuelMatchFound,
	v1.NotificationKind_NOTIFICATION_KIND_DUEL_RESULT:                service.KindDuelResult,
	v1.NotificationKind_NOTIFICATION_KIND_DUEL_WIN_STREAK:            service.KindDuelWinStreak,
	v1.NotificationKind_NOTIFICATION_KIND_STREAK_WARNING:             service.KindStreakWarning,
	v1.NotificationKind_NOTIFICATION_KIND_STREAK_MILESTONE:           service.KindStreakMilestone,
	v1.NotificationKind_NOTIFICATION_KIND_RATING_MILESTONE:           service.KindRatingMilestone,
	v1.NotificationKind_NOTIFICATION_KIND_MOCK_RESULT:                service.KindMockResult,
	v1.NotificationKind_NOTIFICATION_KIND_REVIEW_READY:               service.KindReviewReady,
	v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_EVENT_CREATED:       service.KindCircleEventCreated,
	v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_EVENT_REMINDER:      service.KindCircleEventReminder,
	v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_INVITE:              service.KindCircleInvite,
	v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_CHALLENGE_COMPLETED: service.KindCircleChallengeCompleted,
	v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_MEMBER_JOINED:       service.KindCircleMemberJoined,
	v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_CHALLENGE_PROGRESS:  service.KindCircleChallengeProgress,
	v1.NotificationKind_NOTIFICATION_KIND_CIRCLE_WEEKLY_DIGEST:       service.KindCircleWeeklyDigest,
	v1.NotificationKind_NOTIFICATION_KIND_DAILY_CHALLENGE:            service.KindDailyChallenge,
	v1.NotificationKind_NOTIFICATION_KIND_RE_ENGAGEMENT_CIRCLE:       service.KindReEngagementCircle,
	v1.NotificationKind_NOTIFICATION_KIND_RE_ENGAGEMENT_PERSONAL:     service.KindReEngagementPersonal,
}

func notificationKind(kind v1.NotificationKind) (string, bool) {
	value, ok := protoToKind[kind]
	return value, ok
}
