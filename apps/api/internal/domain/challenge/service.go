package challenge

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"api/internal/aireview"
	challengedata "api/internal/data/challenge"
	"api/internal/model"
)

var errReviewTooShort = errors.New("review too short")

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

// Daily challenge methods (SubmitDailyReview, GetDailyLeaderboard,
// GetUserDailyScore) lived here historically. All three RPCs were
// deleted as dead in Wave 2 — the frontend never consumed them — so
// the service methods and their repo helpers went with them. Bring
// them back alongside a real UI when daily challenge ships.

// ── Blind Review ──────────────────────────────────────────────────────

// GetBlindReviewTask returns a random code submission for the user to review.
func (s *Service) GetBlindReviewTask(ctx context.Context, userID uuid.UUID) (*model.BlindReviewTask, error) {
	task, err := s.repo.GetRandomBlindReviewTask(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get blind review task: %w", err)
	}
	return task, nil
}

// SubmitBlindReview evaluates the user's code review using AI and stores the result.
func (s *Service) SubmitBlindReview(ctx context.Context, userID, sourceReviewID, taskID uuid.UUID, sourceCode, sourceLang, userReview string) (*model.BlindReviewResult, error) {
	if len(userReview) < 10 {
		return nil, fmt.Errorf("%w", errReviewTooShort)
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

	result, err := s.repo.InsertBlindReviewSession(ctx, userID, sourceReviewID, taskID, sourceCode, sourceLang, userReview, aiScore, aiFeedback)
	if err != nil {
		return nil, fmt.Errorf("insert blind review session: %w", err)
	}
	return result, nil
}

// ── Speed Run ──────────────────────────────────────────────────────────

// GetUserRecords returns the user's personal bests.
func (s *Service) GetUserRecords(ctx context.Context, userID uuid.UUID, limit int) ([]model.TaskRecord, error) {
	records, err := s.repo.GetUserRecords(ctx, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("get user records: %w", err)
	}
	return records, nil
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

// GetWeeklyTask returns the deterministically selected task for the current week.
// Returns nil if no hard tasks are configured.
func (s *Service) GetWeeklyTask(ctx context.Context, weekKey string) (*model.WeeklyInfo, error) {
	ids, err := s.repo.GetHardTaskIDs(ctx)
	if err != nil {
		return nil, fmt.Errorf("get hard task IDs: %w", err)
	}
	if len(ids) == 0 {
		return nil, nil //nolint:nilnil
	}
	taskID := SelectWeeklyTask(ids, weekKey)
	title, slug, err := s.repo.GetTaskInfo(ctx, taskID)
	if err != nil {
		return nil, fmt.Errorf("get task info: %w", err)
	}
	return &model.WeeklyInfo{
		WeekKey:    weekKey,
		TaskID:     taskID,
		TaskTitle:  title,
		TaskSlug:   slug,
		Difficulty: "hard",
		EndsAt:     WeekEndsAt(),
	}, nil
}

// GetWeeklyLeaderboard returns the leaderboard for the current week.
func (s *Service) GetWeeklyLeaderboard(ctx context.Context, weekKey string, limit int) ([]model.WeeklyEntry, error) {
	entries, err := s.repo.GetWeeklyLeaderboard(ctx, weekKey, limit)
	if err != nil {
		return nil, fmt.Errorf("get weekly leaderboard: %w", err)
	}
	return entries, nil
}

// GetUserWeeklyEntry returns the user's entry for the current week.
func (s *Service) GetUserWeeklyEntry(ctx context.Context, userID uuid.UUID, weekKey string) (*model.WeeklyEntry, error) {
	entry, err := s.repo.GetUserWeeklyEntry(ctx, userID, weekKey)
	if err != nil {
		return nil, fmt.Errorf("get user weekly entry: %w", err)
	}
	return entry, nil
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
