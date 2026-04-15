package model

import (
	"time"

	"github.com/google/uuid"
)

type Circle struct {
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

type CircleMember struct {
	CircleID uuid.UUID
	UserID   uuid.UUID
	Role     string
	JoinedAt time.Time
}

type CircleMemberProfile struct {
	UserID    uuid.UUID
	FirstName string
	LastName  string
	AvatarURL string
	Role      string
	JoinedAt  time.Time
}

type ListCirclesOptions struct {
	Limit  int32
	Offset int32
}

const (
	DefaultCirclesLimit = 20
	MaxCirclesLimit     = 100
)

type ListCirclesResponse struct {
	Circles    []*Circle
	TotalCount int32
}

// CirclePulse aggregates recent member activity within a circle.
type CirclePulse struct {
	ActiveToday   int32
	TotalMembers  int32
	WeekActivity  []*CircleDayActivity
	RecentActions []*CircleMemberAction
}

// CircleDayActivity summarises activity for a single calendar day.
type CircleDayActivity struct {
	Date       string // YYYY-MM-DD
	DailyCount int32
	DuelCount  int32
	MockCount  int32
}

// CircleMemberAction represents a single trackable action by a circle member.
type CircleMemberAction struct {
	UserID       uuid.UUID
	FirstName    string
	LastName     string
	AvatarURL    string
	ActionType   string // "daily", "duel", "mock"
	ActionDetail string // e.g. "won vs Ivan", "Google mock"
	HappenedAt   time.Time
}

// CircleChallenge is a time-boxed group goal for a circle.
type CircleChallenge struct {
	ID          uuid.UUID
	CircleID    uuid.UUID
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

// CircleMemberStats enriches a circle member with cross-feature activity stats.
type CircleMemberStats struct {
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

// CreateCircleChallengeRequest holds parameters for creating a circle challenge.
type CreateCircleChallengeRequest struct {
	CircleID    uuid.UUID
	TemplateKey string
	TargetValue int32
	StartsAt    time.Time
	EndsAt      time.Time
	CreatedBy   uuid.UUID
}
