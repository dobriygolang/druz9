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

	// Guild events.
	KindGuildEventCreated  = "guild_event_created"
	KindGuildEventReminder = "guild_event_reminder"
	KindGuildInvite        = "guild_invite"

	// Guild activity.
	KindGuildChallengeCompleted = "guild_challenge_completed"
	KindGuildMemberJoined       = "guild_member_joined"
	KindGuildChallengeProgress  = "guild_challenge_progress"

	// Guild digest.
	KindGuildWeeklyDigest = "guild_weekly_digest"

	// Daily.
	KindDailyChallenge = "daily_challenge"

	// Re-engagement.
	KindReEngagementGuild   = "re_engagement_guild"
	KindReEngagementPersonal = "re_engagement_personal"
)

// Categories.
const (
	CategoryDuels          = "duels"
	CategoryProgress       = "progress"
	CategoryGuilds        = "guilds"
	CategoryDailyChallenge = "daily_challenge"
)

// Guild subcategories.
const (
	GuildSubEvents   = "events"
	GuildSubActivity = "activity"
	GuildSubDigest   = "digest"
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

	KindGuildEventCreated:       CategoryGuilds,
	KindGuildEventReminder:      CategoryGuilds,
	KindGuildInvite:             CategoryGuilds,
	KindGuildChallengeCompleted: CategoryGuilds,
	KindGuildMemberJoined:       CategoryGuilds,
	KindGuildChallengeProgress:  CategoryGuilds,
	KindGuildWeeklyDigest:       CategoryGuilds,

	KindDailyChallenge: CategoryDailyChallenge,
}

var kindToGuildSub = map[string]string{
	KindGuildEventCreated:       GuildSubEvents,
	KindGuildEventReminder:      GuildSubEvents,
	KindGuildChallengeCompleted: GuildSubActivity,
	KindGuildMemberJoined:       GuildSubActivity,
	KindGuildChallengeProgress:  GuildSubActivity,
	KindGuildWeeklyDigest:       GuildSubDigest,
}

// CategoryForKind returns the global category for a notification kind.
func CategoryForKind(kind string) string {
	return kindToCategory[kind]
}

// GuildSubForKind returns the guild subcategory, or empty if not a guild kind.
func GuildSubForKind(kind string) string {
	return kindToGuildSub[kind]
}

// IsGuildKind returns true if the notification kind belongs to guilds.
func IsGuildKind(kind string) bool {
	return kindToCategory[kind] == CategoryGuilds
}

// IsReEngagement returns true for re-engagement notification kinds.
func IsReEngagement(kind string) bool {
	return kind == KindReEngagementGuild || kind == KindReEngagementPersonal
}
