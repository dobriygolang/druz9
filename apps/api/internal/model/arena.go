package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	ArenaMatchStatusWaiting  = "waiting"
	ArenaMatchStatusActive   = "active"
	ArenaMatchStatusFinished = "finished"

	ArenaMatchSourceInvite      = "invite"
	ArenaMatchSourceMatchmaking = "matchmaking"

	ArenaPlayerSideLeft  = "left"
	ArenaPlayerSideRight = "right"

	ArenaWinnerReasonAcceptedTime = "accepted_time"
	ArenaWinnerReasonRuntime      = "runtime"
	ArenaWinnerReasonTimeout      = "timeout"
	ArenaWinnerReasonSingleAC     = "single_ac"
	ArenaWinnerReasonNone         = "none"
)

type ArenaMatch struct {
	ID                uuid.UUID      `json:"id"`
	CreatorUserID     uuid.UUID      `json:"creator_user_id"`
	TaskID            uuid.UUID      `json:"task_id"`
	Topic             string         `json:"topic"`
	Difficulty        string         `json:"difficulty"`
	Source            string         `json:"source"`
	Status            string         `json:"status"`
	DurationSeconds   int32          `json:"duration_seconds"`
	ObfuscateOpponent bool           `json:"obfuscate_opponent"`
	IsRated           bool           `json:"is_rated"`
	UnratedReason     string         `json:"unrated_reason"`
	AntiCheatEnabled  bool           `json:"anti_cheat_enabled"`
	WinnerUserID      *uuid.UUID     `json:"winner_user_id,omitempty"`
	WinnerReason      string         `json:"winner_reason,omitempty"`
	StartedAt         *time.Time     `json:"started_at,omitempty"`
	FinishedAt        *time.Time     `json:"finished_at,omitempty"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	Task              *CodeTask      `json:"task,omitempty"`
	Players           []*ArenaPlayer `json:"players"`
}

type ArenaPlayer struct {
	MatchID        uuid.UUID  `json:"match_id"`
	UserID         uuid.UUID  `json:"user_id"`
	DisplayName    string     `json:"display_name"`
	Side           string     `json:"side"`
	IsCreator      bool       `json:"is_creator"`
	FreezeUntil    *time.Time `json:"freeze_until,omitempty"`
	AcceptedAt     *time.Time `json:"accepted_at,omitempty"`
	BestRuntimeMs  int64      `json:"best_runtime_ms"`
	IsWinner       bool       `json:"is_winner"`
	SuspicionCount int32      `json:"suspicion_count"`
	JoinedAt       time.Time  `json:"joined_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	CurrentCode    string     `json:"current_code,omitempty"`
}

type ArenaSubmission struct {
	ID          uuid.UUID  `json:"id"`
	MatchID     uuid.UUID  `json:"match_id"`
	UserID      uuid.UUID  `json:"user_id"`
	Code        string     `json:"code"`
	Output      string     `json:"output"`
	Error       string     `json:"error"`
	RuntimeMs   int64      `json:"runtime_ms"`
	IsCorrect   bool       `json:"is_correct"`
	PassedCount int32      `json:"passed_count"`
	TotalCount  int32      `json:"total_count"`
	SubmittedAt time.Time  `json:"submitted_at"`
	FreezeUntil *time.Time `json:"freeze_until,omitempty"`
}

type ArenaLeaderboardEntry struct {
	UserID      string  `json:"user_id"`
	DisplayName string  `json:"display_name"`
	Rating      int32   `json:"rating"`
	League      string  `json:"league"`
	Wins        int32   `json:"wins"`
	Losses      int32   `json:"losses"`
	Matches     int32   `json:"matches"`
	WinRate     float64 `json:"win_rate"`
	BestRuntime int64   `json:"best_runtime"`
}

type ArenaQueueEntry struct {
	UserID      uuid.UUID `json:"user_id"`
	DisplayName string    `json:"display_name"`
	Topic       string    `json:"topic"`
	Difficulty  string    `json:"difficulty"`
	QueuedAt    time.Time `json:"queued_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ArenaQueueState struct {
	Status     string      `json:"status"`
	Topic      string      `json:"topic"`
	Difficulty string      `json:"difficulty"`
	QueuedAt   *time.Time  `json:"queued_at,omitempty"`
	QueueSize  int32       `json:"queue_size"`
	Match      *ArenaMatch `json:"match,omitempty"`
}

type ArenaPlayerStats struct {
	UserID      string  `json:"user_id"`
	DisplayName string  `json:"display_name"`
	Rating      int32   `json:"rating"`
	League      string  `json:"league"`
	Wins        int32   `json:"wins"`
	Losses      int32   `json:"losses"`
	Matches     int32   `json:"matches"`
	WinRate     float64 `json:"win_rate"`
	BestRuntime int64   `json:"best_runtime"`
}
