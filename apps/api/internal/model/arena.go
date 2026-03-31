package model

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type ArenaMatchStatus int

const (
	ArenaMatchStatusUnknown ArenaMatchStatus = iota
	ArenaMatchStatusWaiting
	ArenaMatchStatusActive
	ArenaMatchStatusFinished
)

func (s ArenaMatchStatus) String() string {
	switch s {
	case ArenaMatchStatusWaiting:
		return "waiting"
	case ArenaMatchStatusActive:
		return "active"
	case ArenaMatchStatusFinished:
		return "finished"
	default:
		return ""
	}
}

func ArenaMatchStatusFromString(s string) ArenaMatchStatus {
	switch s {
	case "waiting":
		return ArenaMatchStatusWaiting
	case "active":
		return ArenaMatchStatusActive
	case "finished":
		return ArenaMatchStatusFinished
	default:
		return ArenaMatchStatusUnknown
	}
}

type ArenaMatchSource int

const (
	ArenaMatchSourceUnknown ArenaMatchSource = iota
	ArenaMatchSourceInvite
	ArenaMatchSourceMatchmaking
)

func (s ArenaMatchSource) String() string {
	switch s {
	case ArenaMatchSourceInvite:
		return "invite"
	case ArenaMatchSourceMatchmaking:
		return "matchmaking"
	default:
		return ""
	}
}

func ArenaMatchSourceFromString(s string) ArenaMatchSource {
	switch s {
	case "invite":
		return ArenaMatchSourceInvite
	case "matchmaking":
		return ArenaMatchSourceMatchmaking
	default:
		return ArenaMatchSourceUnknown
	}
}

type ArenaPlayerSide int

const (
	ArenaPlayerSideUnknown ArenaPlayerSide = iota
	ArenaPlayerSideLeft
	ArenaPlayerSideRight
)

func (s ArenaPlayerSide) String() string {
	switch s {
	case ArenaPlayerSideLeft:
		return "left"
	case ArenaPlayerSideRight:
		return "right"
	default:
		return ""
	}
}

func ArenaPlayerSideFromString(s string) ArenaPlayerSide {
	switch s {
	case "left":
		return ArenaPlayerSideLeft
	case "right":
		return ArenaPlayerSideRight
	default:
		return ArenaPlayerSideUnknown
	}
}

type ArenaWinnerReason int

const (
	ArenaWinnerReasonUnknown ArenaWinnerReason = iota
	ArenaWinnerReasonAcceptedTime
	ArenaWinnerReasonRuntime
	ArenaWinnerReasonTimeout
	ArenaWinnerReasonSingleAC
	ArenaWinnerReasonNone
)

func (r ArenaWinnerReason) String() string {
	switch r {
	case ArenaWinnerReasonAcceptedTime:
		return "accepted_time"
	case ArenaWinnerReasonRuntime:
		return "runtime"
	case ArenaWinnerReasonTimeout:
		return "timeout"
	case ArenaWinnerReasonSingleAC:
		return "single_ac"
	case ArenaWinnerReasonNone:
		return "none"
	default:
		return ""
	}
}

func ArenaWinnerReasonFromString(s string) ArenaWinnerReason {
	switch s {
	case "accepted_time":
		return ArenaWinnerReasonAcceptedTime
	case "runtime":
		return ArenaWinnerReasonRuntime
	case "timeout":
		return ArenaWinnerReasonTimeout
	case "single_ac":
		return ArenaWinnerReasonSingleAC
	case "none":
		return ArenaWinnerReasonNone
	default:
		return ArenaWinnerReasonUnknown
	}
}

type ArenaDifficulty int

const (
	ArenaDifficultyUnknown ArenaDifficulty = iota
	ArenaDifficultyEasy
	ArenaDifficultyMedium
	ArenaDifficultyHard
)

func (d ArenaDifficulty) String() string {
	switch d {
	case ArenaDifficultyEasy:
		return "easy"
	case ArenaDifficultyMedium:
		return "medium"
	case ArenaDifficultyHard:
		return "hard"
	default:
		return ""
	}
}

func ArenaDifficultyFromString(s string) ArenaDifficulty {
	switch s {
	case "easy":
		return ArenaDifficultyEasy
	case "medium":
		return ArenaDifficultyMedium
	case "hard":
		return ArenaDifficultyHard
	default:
		return ArenaDifficultyUnknown
	}
}

type ArenaLeague int

const (
	ArenaLeagueUnknown ArenaLeague = iota
	ArenaLeagueBronze
	ArenaLeagueSilver
	ArenaLeagueGold
	ArenaLeaguePlatinum
	ArenaLeagueDiamond
	ArenaLeagueMaster
	ArenaLeagueLegend
)

func (l ArenaLeague) String() string {
	switch l {
	case ArenaLeagueBronze:
		return "bronze"
	case ArenaLeagueSilver:
		return "silver"
	case ArenaLeagueGold:
		return "gold"
	case ArenaLeaguePlatinum:
		return "platinum"
	case ArenaLeagueDiamond:
		return "diamond"
	case ArenaLeagueMaster:
		return "master"
	case ArenaLeagueLegend:
		return "legend"
	default:
		return ""
	}
}

func ArenaLeagueFromString(s string) ArenaLeague {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "bronze":
		return ArenaLeagueBronze
	case "silver":
		return ArenaLeagueSilver
	case "gold":
		return ArenaLeagueGold
	case "platinum":
		return ArenaLeaguePlatinum
	case "diamond":
		return ArenaLeagueDiamond
	case "master":
		return ArenaLeagueMaster
	case "legend":
		return ArenaLeagueLegend
	default:
		return ArenaLeagueUnknown
	}
}

type ArenaMatch struct {
	ID                uuid.UUID
	CreatorUserID     uuid.UUID
	TaskID            uuid.UUID
	Topic             string
	Difficulty        ArenaDifficulty
	Source            ArenaMatchSource
	Status            ArenaMatchStatus
	DurationSeconds   int32
	ObfuscateOpponent bool
	IsRated           bool
	UnratedReason     string
	AntiCheatEnabled  bool
	WinnerUserID      *uuid.UUID
	WinnerReason      ArenaWinnerReason
	StartedAt         *time.Time
	FinishedAt        *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
	Task              *CodeTask
	Players           []*ArenaPlayer
}

type ArenaPlayer struct {
	MatchID        uuid.UUID
	UserID         uuid.UUID
	DisplayName    string
	Side           ArenaPlayerSide
	IsCreator      bool
	FreezeUntil    *time.Time
	AcceptedAt     *time.Time
	BestRuntimeMs  int64
	IsWinner       bool
	SuspicionCount int32
	JoinedAt       time.Time
	UpdatedAt      time.Time
	CurrentCode    string
}

type ArenaSubmission struct {
	ID          uuid.UUID
	MatchID     uuid.UUID
	UserID      uuid.UUID
	Code        string
	Output      string
	Error       string
	RuntimeMs   int64
	IsCorrect   bool
	PassedCount int32
	TotalCount  int32
	SubmittedAt time.Time
	FreezeUntil *time.Time
}

type ArenaLeaderboardEntry struct {
	UserID      string
	DisplayName string
	Rating      int32
	League      ArenaLeague
	Wins        int32
	Losses      int32
	Matches     int32
	WinRate     float64
	BestRuntime int64
}

type ArenaQueueEntry struct {
	UserID      uuid.UUID
	DisplayName string
	Topic       string
	Difficulty  ArenaDifficulty
	QueuedAt    time.Time
	UpdatedAt   time.Time
}

type ArenaQueueState struct {
	Status     ArenaMatchStatus
	Topic      string
	Difficulty ArenaDifficulty
	QueuedAt   *time.Time
	QueueSize  int32
	Match      *ArenaMatch
}

type ArenaPlayerStats struct {
	UserID      string
	DisplayName string
	Rating      int32
	League      ArenaLeague
	Wins        int32
	Losses      int32
	Matches     int32
	WinRate     float64
	BestRuntime int64
}
