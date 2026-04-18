package model

import (
	"time"

	"github.com/google/uuid"
)

// ReplaySourceKind mirrors the proto enum.
type ReplaySourceKind int32

const (
	ReplaySourceUnspecified ReplaySourceKind = 0
	ReplaySourceArena       ReplaySourceKind = 1
	ReplaySourceChallenge   ReplaySourceKind = 2
)

// ReplayEventKind mirrors the proto enum.
type ReplayEventKind int32

const (
	ReplayEventKindUnspecified ReplayEventKind = 0
	ReplayEventKindKeystroke   ReplayEventKind = 1
	ReplayEventKindRun         ReplayEventKind = 2
	ReplayEventKindSubmitPass  ReplayEventKind = 3
	ReplayEventKindSubmitFail  ReplayEventKind = 4
	ReplayEventKindHint        ReplayEventKind = 5
	ReplayEventKindMilestone   ReplayEventKind = 6
)

// DuelReplaySummary is the immutable top-level record for a replay.
type DuelReplaySummary struct {
	ID              uuid.UUID        `json:"id"`
	SourceKind      ReplaySourceKind `json:"sourceKind"`
	SourceID        uuid.UUID        `json:"sourceId"`
	Player1ID       uuid.UUID        `json:"player1Id"`
	Player1Username string           `json:"player1Username"`
	Player2ID       uuid.UUID        `json:"player2Id"`
	Player2Username string           `json:"player2Username"`
	TaskTitle       string           `json:"taskTitle"`
	TaskTopic       string           `json:"taskTopic"`
	TaskDifficulty  int32            `json:"taskDifficulty"`
	DurationMs      int32            `json:"durationMs"`
	WinnerID        *uuid.UUID       `json:"winnerId,omitempty"`
	CompletedAt     time.Time        `json:"completedAt"`
	CreatedAt       time.Time        `json:"createdAt"`
}

// DuelReplayEvent is one point on the replay timeline.
type DuelReplayEvent struct {
	ID         uuid.UUID       `json:"id"`
	ReplayID   uuid.UUID       `json:"replayId"`
	UserID     uuid.UUID       `json:"userId"`
	TMs        int32           `json:"tMs"`
	Kind       ReplayEventKind `json:"kind"`
	Label      string          `json:"label"`
	LinesCount *int32          `json:"linesCount,omitempty"`
	CreatedAt  time.Time       `json:"createdAt"`
}

// ReplayWithEvents bundles summary + event stream for the viewer.
type ReplayWithEvents struct {
	Summary *DuelReplaySummary `json:"summary"`
	Events  []*DuelReplayEvent `json:"events"`
}

// ReplayList is the paginated list response.
type ReplayList struct {
	Replays []*DuelReplaySummary `json:"replays"`
	Total   int32                `json:"total"`
}

// RecordEventInput is what the domain service needs to append an event.
type RecordEventInput struct {
	ReplayID   uuid.UUID
	UserID     uuid.UUID
	TMs        int32
	Kind       ReplayEventKind
	Label      string
	LinesCount *int32
}
