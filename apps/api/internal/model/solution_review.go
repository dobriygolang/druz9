package model

import (
	"time"

	"github.com/google/uuid"
)

// ReviewSourceType identifies where the submission came from.
type ReviewSourceType string

const (
	ReviewSourceDaily    ReviewSourceType = "daily"
	ReviewSourcePractice ReviewSourceType = "practice"
	ReviewSourceDuel     ReviewSourceType = "duel"
	ReviewSourceMock     ReviewSourceType = "mock"
)

// ReviewStatus tracks the async AI review lifecycle.
type ReviewStatus string

const (
	ReviewStatusPending ReviewStatus = "pending"
	ReviewStatusReady   ReviewStatus = "ready"
	ReviewStatusFailed  ReviewStatus = "failed"
)

// AIVerdict classifies the quality of an accepted solution.
type AIVerdict string

const (
	AIVerdictOptimal    AIVerdict = "optimal"
	AIVerdictGood       AIVerdict = "good"
	AIVerdictSuboptimal AIVerdict = "suboptimal"
	AIVerdictBruteForce AIVerdict = "brute_force"
)

// SolutionReview is the unified post-solve review entity.
type SolutionReview struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	SubmissionID uuid.UUID
	SourceType   ReviewSourceType
	TaskID       uuid.UUID

	// Level 1: instant feedback
	IsCorrect     bool
	AttemptNumber int
	SolveTimeMs   int64
	MedianTimeMs  int64
	PassedCount   int32
	TotalCount    int32

	// Level 2: AI review (populated asynchronously)
	Status          ReviewStatus
	AIVerdict       AIVerdict
	AITimeComplexity  string
	AISpaceComplexity string
	AIPattern       string
	AIStrengths     []string
	AIWeaknesses    []string
	AIHint          string
	AISkillSignals  map[string]string // e.g. {"arrays": "strong", "dp": "weak"}
	AIProvider      string
	AIModel         string

	// Level 3: duel comparison
	OpponentSubmissionID *uuid.UUID
	ComparisonSummary    string

	CreatedAt time.Time
}

// TaskStats holds aggregated solve statistics for a single task.
type TaskStats struct {
	TaskID          uuid.UUID
	MedianSolveTimeMs int64
	TotalSolves     int
	UpdatedAt       time.Time
}
