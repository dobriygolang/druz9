package challenge

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// BlindReviewTask is the data served to the user for a blind review session.
type BlindReviewTask struct {
	SourceReviewID uuid.UUID `json:"sourceReviewId"`
	TaskID         uuid.UUID `json:"taskId"`
	TaskTitle      string    `json:"taskTitle"`
	TaskStatement  string    `json:"taskStatement"`
	Code           string    `json:"code"`
	Language       string    `json:"language"`
}

// BlindReviewResult is the result after AI evaluates the user's review.
type BlindReviewResult struct {
	ID          uuid.UUID `json:"id"`
	AIScore     int32     `json:"aiScore"`
	AIFeedback  string    `json:"aiFeedback"`
	SubmittedAt time.Time `json:"submittedAt"`
}

// GetRandomBlindReviewTask selects a random correct, non-optimal solution for review.
// Excludes solutions from the current user.
func (r *Repo) GetRandomBlindReviewTask(ctx context.Context, userID uuid.UUID) (*BlindReviewTask, error) {
	var t BlindReviewTask
	err := r.data.DB.QueryRow(ctx, `
		SELECT sr.id, sr.task_id, ct.title, ct.statement,
		       COALESCE(cs.output, ''), COALESCE(sr.ai_verdict, '')
		FROM solution_reviews sr
		JOIN code_tasks ct ON ct.id = sr.task_id
		LEFT JOIN code_submissions cs ON cs.id = sr.submission_id
		WHERE sr.is_correct = true
		  AND sr.user_id != $1
		  AND sr.status = 'ready'
		  AND sr.ai_verdict IS NOT NULL
		  AND sr.ai_verdict != 'optimal'
		ORDER BY RANDOM()
		LIMIT 1
	`, userID).Scan(&t.SourceReviewID, &t.TaskID, &t.TaskTitle, &t.TaskStatement, &t.Code, &t.Language)
	if err != nil {
		return nil, fmt.Errorf("get blind review task: %w", err)
	}
	return &t, nil
}

// InsertBlindReviewSession stores a completed blind review session.
func (r *Repo) InsertBlindReviewSession(ctx context.Context, userID uuid.UUID, sourceReviewID uuid.UUID, taskID uuid.UUID, sourceCode, sourceLang, userReview string, aiScore int32, aiFeedback string) (*BlindReviewResult, error) {
	var result BlindReviewResult
	err := r.data.DB.QueryRow(ctx, `
		INSERT INTO blind_review_sessions (user_id, source_review_id, task_id, source_code, source_language, user_review, ai_score, ai_feedback)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, ai_score, ai_feedback, submitted_at
	`, userID, sourceReviewID, taskID, sourceCode, sourceLang, userReview, aiScore, aiFeedback).Scan(
		&result.ID, &result.AIScore, &result.AIFeedback, &result.SubmittedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert blind review: %w", err)
	}
	return &result, nil
}

// CountUserBlindReviews returns how many blind reviews a user completed today.
func (r *Repo) CountUserBlindReviewsToday(ctx context.Context, userID uuid.UUID) (int32, error) {
	var count int32
	err := r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM blind_review_sessions
		WHERE user_id = $1
		  AND submitted_at >= CURRENT_DATE
		  AND submitted_at < CURRENT_DATE + INTERVAL '1 day'
	`, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count blind reviews: %w", err)
	}
	return count, nil
}
