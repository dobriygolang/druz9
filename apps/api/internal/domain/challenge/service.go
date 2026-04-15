package challenge

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"time"

	"api/internal/aireview"
	challengedata "api/internal/data/challenge"

	"github.com/google/uuid"
)

// Service implements all challenge game mode logic.
type Service struct {
	repo     *challengedata.Repo
	reviewer aireview.Reviewer
}

// Config holds dependencies for the challenge service.
type Config struct {
	Repository *challengedata.Repo
	Reviewer   aireview.Reviewer
}

// NewService creates a new challenge service.
func NewService(c Config) *Service {
	return &Service{
		repo:     c.Repository,
		reviewer: c.Reviewer,
	}
}

// ── Daily Challenge ──────────────────────────────────────────────────

// SubmitDailyReview records the user's AI review score for today's daily challenge.
func (s *Service) SubmitDailyReview(ctx context.Context, userID uuid.UUID, taskID uuid.UUID, aiScore int32) error {
	if aiScore < 0 || aiScore > 10 {
		return fmt.Errorf("invalid AI score: %d", aiScore)
	}
	return s.repo.UpsertDailyResult(ctx, userID, taskID, aiScore)
}

// GetDailyLeaderboard returns today's top performers.
func (s *Service) GetDailyLeaderboard(ctx context.Context, limit int) ([]challengedata.DailyResult, error) {
	return s.repo.GetDailyLeaderboard(ctx, limit)
}

// GetUserDailyScore returns the user's best score for today.
func (s *Service) GetUserDailyScore(ctx context.Context, userID uuid.UUID) (int32, error) {
	return s.repo.GetUserDailyScore(ctx, userID)
}

// ── Blind Review ──────────────────────────────────────────────────────

// GetBlindReviewTask returns a random code submission for the user to review.
func (s *Service) GetBlindReviewTask(ctx context.Context, userID uuid.UUID) (*challengedata.BlindReviewTask, error) {
	return s.repo.GetRandomBlindReviewTask(ctx, userID)
}

// SubmitBlindReview evaluates the user's code review using AI and stores the result.
func (s *Service) SubmitBlindReview(ctx context.Context, userID uuid.UUID, sourceReviewID uuid.UUID, taskID uuid.UUID, sourceCode, sourceLang, userReview string) (*challengedata.BlindReviewResult, error) {
	if len(userReview) < 10 {
		return nil, fmt.Errorf("review too short")
	}
	if len(userReview) > 5000 {
		userReview = userReview[:5000]
	}

	// Use AI to evaluate the quality of the user's code review.
	review, err := s.reviewer.ReviewInterviewSolution(ctx, aireview.InterviewSolutionReviewRequest{
		StageKind: "code_review",
		TaskTitle: "Code Review Quality Evaluation",
		Statement: fmt.Sprintf(
			"Evaluate the quality of this code review.\n\nOriginal code (%s):\n```\n%s\n```\n\nThe user's review:\n```\n%s\n```\n\nScore 1-10 based on: identification of real issues, quality of suggestions, understanding of the code, constructiveness.",
			sourceLang, truncate(sourceCode, 4000), userReview,
		),
		CandidateCode: userReview,
	})

	aiScore := int32(0)
	aiFeedback := ""
	if err == nil && review != nil {
		aiScore = int32(review.Score)
		aiFeedback = review.Summary
	}

	return s.repo.InsertBlindReviewSession(ctx, userID, sourceReviewID, taskID, sourceCode, sourceLang, userReview, aiScore, aiFeedback)
}

// ── Speed Run ──────────────────────────────────────────────────────────

// RecordSpeedRun saves a speed-run attempt and returns whether it was a new PB.
func (s *Service) RecordSpeedRun(ctx context.Context, userID uuid.UUID, taskID uuid.UUID, timeMs int64, aiScore int32) (*challengedata.RecordResult, error) {
	if timeMs <= 0 {
		return nil, fmt.Errorf("invalid time: %d", timeMs)
	}
	return s.repo.UpsertTaskRecord(ctx, userID, taskID, timeMs, aiScore)
}

// GetUserRecords returns the user's personal bests.
func (s *Service) GetUserRecords(ctx context.Context, userID uuid.UUID, limit int) ([]challengedata.TaskRecord, error) {
	return s.repo.GetUserRecords(ctx, userID, limit)
}

// ── Weekly Boss ────────────────────────────────────────────────────────

// CurrentWeekKey returns the ISO week key for the current date (e.g., "2026-W16").
func CurrentWeekKey() string {
	year, week := time.Now().UTC().ISOWeek()
	return fmt.Sprintf("%d-W%02d", year, week)
}

// SelectWeeklyTask deterministically picks a hard task for the current week.
func SelectWeeklyTask(tasks []uuid.UUID, weekKey string) uuid.UUID {
	if len(tasks) == 0 {
		return uuid.Nil
	}
	h := sha256.Sum256([]byte("weekly:" + weekKey))
	idx := binary.BigEndian.Uint64(h[:8]) % uint64(len(tasks))
	return tasks[idx]
}

// WeekEndsAt returns the end of the current ISO week (next Monday 00:00 UTC).
func WeekEndsAt() time.Time {
	now := time.Now().UTC()
	daysUntilMonday := (8 - int(now.Weekday())) % 7
	if daysUntilMonday == 0 {
		daysUntilMonday = 7
	}
	return time.Date(now.Year(), now.Month(), now.Day()+daysUntilMonday, 0, 0, 0, 0, time.UTC)
}

// SubmitWeeklyBoss records a weekly boss attempt.
func (s *Service) SubmitWeeklyBoss(ctx context.Context, userID uuid.UUID, weekKey string, taskID uuid.UUID, aiScore int32, solveTimeMs int64, code, language string) error {
	return s.repo.UpsertWeeklyEntry(ctx, userID, weekKey, taskID, aiScore, solveTimeMs, code, language)
}

// GetWeeklyLeaderboard returns the leaderboard for the current week.
func (s *Service) GetWeeklyLeaderboard(ctx context.Context, weekKey string, limit int) ([]challengedata.WeeklyEntry, error) {
	return s.repo.GetWeeklyLeaderboard(ctx, weekKey, limit)
}

// GetUserWeeklyEntry returns the user's entry for the current week.
func (s *Service) GetUserWeeklyEntry(ctx context.Context, userID uuid.UUID, weekKey string) (*challengedata.WeeklyEntry, error) {
	return s.repo.GetUserWeeklyEntry(ctx, userID, weekKey)
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
