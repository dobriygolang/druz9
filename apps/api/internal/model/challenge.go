package model

import (
	"time"

	"github.com/google/uuid"
)

// Challenge DTOs previously lived inside the data/challenge package next
// to their SQL helpers. That coupled the transport layer (api/challenge)
// directly to the data package — a clean-architecture break. Centralising
// them here lets the api and data layers both refer to model-owned types.

// DailyResult is one row on the daily challenge leaderboard.
type DailyResult struct {
	UserID      uuid.UUID `json:"userId"`
	DisplayName string    `json:"displayName"`
	AvatarURL   string    `json:"avatarUrl"`
	AIScore     int32     `json:"aiScore"`
	SubmittedAt time.Time `json:"submittedAt"`
}

// BlindReviewTask is the payload served to the user for a blind review.
type BlindReviewTask struct {
	SourceReviewID uuid.UUID `json:"sourceReviewId"`
	TaskID         uuid.UUID `json:"taskId"`
	TaskTitle      string    `json:"taskTitle"`
	TaskStatement  string    `json:"taskStatement"`
	Code           string    `json:"code"`
	Language       string    `json:"language"`
}

// BlindReviewResult is returned after the AI graded the user's review.
type BlindReviewResult struct {
	ID          uuid.UUID `json:"id"`
	AIScore     int32     `json:"aiScore"`
	AIFeedback  string    `json:"aiFeedback"`
	SubmittedAt time.Time `json:"submittedAt"`
}

// TaskRecord is a user's personal best on a task (speed-run mode).
type TaskRecord struct {
	TaskID      uuid.UUID `json:"taskId"`
	TaskTitle   string    `json:"taskTitle"`
	BestTimeMs  int64     `json:"bestTimeMs"`
	BestAIScore int32     `json:"bestAiScore"`
	Attempts    int32     `json:"attempts"`
	LastAt      time.Time `json:"lastAt"`
}

// RecordResult is the outcome of recording a speed-run attempt.
type RecordResult struct {
	IsNewRecord bool  `json:"isNewRecord"`
	OldBestMs   int64 `json:"oldBestMs"`
	NewBestMs   int64 `json:"newBestMs"`
	Attempts    int32 `json:"attempts"`
}

// WeeklyEntry is one submission on the weekly boss board.
type WeeklyEntry struct {
	UserID      uuid.UUID `json:"userId"`
	DisplayName string    `json:"displayName"`
	AvatarURL   string    `json:"avatarUrl"`
	AIScore     int32     `json:"aiScore"`
	SolveTimeMs int64     `json:"solveTimeMs"`
	SubmittedAt time.Time `json:"submittedAt"`
}

// WeeklyInfo is the current weekly boss challenge metadata.
type WeeklyInfo struct {
	WeekKey    string    `json:"weekKey"`
	TaskID     uuid.UUID `json:"taskId"`
	TaskTitle  string    `json:"taskTitle"`
	TaskSlug   string    `json:"taskSlug"`
	Difficulty string    `json:"difficulty"`
	EndsAt     time.Time `json:"endsAt"`
}
