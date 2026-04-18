package model

import (
	"time"

	"github.com/google/uuid"
)

type Guild struct {
	ID          uuid.UUID
	Name        string
	Description string
	CreatorID   uuid.UUID
	MemberCount int
	Tags        []string
	IsPublic    bool
	IsJoined    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type GuildMember struct {
	GuildID uuid.UUID
	UserID   uuid.UUID
	Role     string
	JoinedAt time.Time
}

type GuildMemberProfile struct {
	UserID    uuid.UUID
	FirstName string
	LastName  string
	AvatarURL string
	Role      string
	JoinedAt  time.Time
}

type ListGuildsOptions struct {
	Limit  int32
	Offset int32
}

const (
	DefaultGuildsLimit = 20
	MaxGuildsLimit     = 100
)

type ListGuildsResponse struct {
	Guilds    []*Guild
	TotalCount int32
}

// GuildPulse aggregates recent member activity within a guild.
type GuildPulse struct {
	ActiveToday   int32
	TotalMembers  int32
	WeekActivity  []*GuildDayActivity
	RecentActions []*GuildMemberAction
}

// GuildDayActivity summarises activity for a single calendar day.
type GuildDayActivity struct {
	Date       string // YYYY-MM-DD
	DailyCount int32
	DuelCount  int32
	MockCount  int32
}

// GuildMemberAction represents a single trackable action by a guild member.
type GuildMemberAction struct {
	UserID       uuid.UUID
	FirstName    string
	LastName     string
	AvatarURL    string
	ActionType   string // "daily", "duel", "mock"
	ActionDetail string // e.g. "won vs Ivan", "Google mock"
	HappenedAt   time.Time
}

// GuildChallenge is a time-boxed group goal for a guild.
type GuildChallenge struct {
	ID          uuid.UUID
	GuildID    uuid.UUID
	TemplateKey string // streak_days, daily_completion, duels_count, mocks_count
	TargetValue int32
	StartsAt    time.Time
	EndsAt      time.Time
	CreatedBy   uuid.UUID
	CreatedAt   time.Time
	Progress    []*ChallengeMemberProgress
}

// ChallengeMemberProgress tracks an individual member's progress toward the challenge goal.
type ChallengeMemberProgress struct {
	UserID    uuid.UUID
	FirstName string
	LastName  string
	AvatarURL string
	Current   int32
}

// GuildMemberStats enriches a guild member with cross-feature activity stats.
type GuildMemberStats struct {
	UserID         uuid.UUID
	FirstName      string
	LastName       string
	AvatarURL      string
	Role           string
	JoinedAt       time.Time
	StreakDays     int32
	DailySolved    int32
	DuelsWon       int32
	DuelsPlayed    int32
	MocksDone      int32
	ReadinessScore int32
	ArenaRating    int32
	ArenaLeague    string
}

// CreateGuildChallengeRequest holds parameters for creating a guild challenge.
type CreateGuildChallengeRequest struct {
	GuildID    uuid.UUID
	TemplateKey string
	TargetValue int32
	StartsAt    time.Time
	EndsAt      time.Time
	CreatedBy   uuid.UUID
}
