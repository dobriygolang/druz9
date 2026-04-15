package service

// Notification kinds.
const (
	// Duels.
	KindDuelInvite     = "duel_invite"
	KindDuelMatchFound = "duel_match_found"
	KindDuelResult     = "duel_result"
	KindDuelWinStreak  = "duel_win_streak"

	// Progress.
	KindStreakWarning   = "streak_warning"
	KindStreakMilestone = "streak_milestone"
	KindRatingMilestone = "rating_milestone"
	KindMockResult      = "mock_result"
	KindReviewReady     = "review_ready"

	// Circle events.
	KindCircleEventCreated  = "circle_event_created"
	KindCircleEventReminder = "circle_event_reminder"
	KindCircleInvite        = "circle_invite"

	// Circle activity.
	KindCircleChallengeCompleted = "circle_challenge_completed"
	KindCircleMemberJoined       = "circle_member_joined"
	KindCircleChallengeProgress  = "circle_challenge_progress"

	// Circle digest.
	KindCircleWeeklyDigest = "circle_weekly_digest"

	// Daily.
	KindDailyChallenge = "daily_challenge"

	// Re-engagement.
	KindReEngagementCircle   = "re_engagement_circle"
	KindReEngagementPersonal = "re_engagement_personal"
)

// Categories.
const (
	CategoryDuels          = "duels"
	CategoryProgress       = "progress"
	CategoryCircles        = "circles"
	CategoryDailyChallenge = "daily_challenge"
)

// Circle subcategories.
const (
	CircleSubEvents   = "events"
	CircleSubActivity = "activity"
	CircleSubDigest   = "digest"
)

var kindToCategory = map[string]string{
	KindDuelInvite:     CategoryDuels,
	KindDuelMatchFound: CategoryDuels,
	KindDuelResult:     CategoryDuels,
	KindDuelWinStreak:  CategoryDuels,

	KindStreakWarning:   CategoryProgress,
	KindStreakMilestone: CategoryProgress,
	KindRatingMilestone: CategoryProgress,
	KindMockResult:      CategoryProgress,
	KindReviewReady:     CategoryProgress,

	KindCircleEventCreated:       CategoryCircles,
	KindCircleEventReminder:      CategoryCircles,
	KindCircleInvite:             CategoryCircles,
	KindCircleChallengeCompleted: CategoryCircles,
	KindCircleMemberJoined:       CategoryCircles,
	KindCircleChallengeProgress:  CategoryCircles,
	KindCircleWeeklyDigest:       CategoryCircles,

	KindDailyChallenge: CategoryDailyChallenge,
}

var kindToCircleSub = map[string]string{
	KindCircleEventCreated:       CircleSubEvents,
	KindCircleEventReminder:      CircleSubEvents,
	KindCircleChallengeCompleted: CircleSubActivity,
	KindCircleMemberJoined:       CircleSubActivity,
	KindCircleChallengeProgress:  CircleSubActivity,
	KindCircleWeeklyDigest:       CircleSubDigest,
}

// CategoryForKind returns the global category for a notification kind.
func CategoryForKind(kind string) string {
	return kindToCategory[kind]
}

// CircleSubForKind returns the circle subcategory, or empty if not a circle kind.
func CircleSubForKind(kind string) string {
	return kindToCircleSub[kind]
}

// IsCircleKind returns true if the notification kind belongs to circles.
func IsCircleKind(kind string) bool {
	return kindToCategory[kind] == CategoryCircles
}

// IsReEngagement returns true for re-engagement notification kinds.
func IsReEngagement(kind string) bool {
	return kind == KindReEngagementCircle || kind == KindReEngagementPersonal
}
