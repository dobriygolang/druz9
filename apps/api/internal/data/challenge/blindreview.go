package challenge

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// GetRandomBlindReviewTask selects a random correct, non-optimal solution for review.
// Excludes solutions from the current user.
func (r *Repo) GetRandomBlindReviewTask(ctx context.Context, userID uuid.UUID) (*model.BlindReviewTask, error) {
	var t model.BlindReviewTask
	err := r.data.DB.QueryRow(ctx, `
		SELECT sr.id, sr.task_id, ct.title, ct.statement,
		       sr.source_code, sr.language
		FROM solution_reviews sr
		JOIN code_tasks ct ON ct.id = sr.task_id
		WHERE sr.is_correct = true
		  AND sr.user_id != $1
		  AND sr.status = 'ready'
		  AND sr.ai_verdict IS NOT NULL
		  AND sr.ai_verdict != 'optimal'
		  AND sr.source_code != ''
		ORDER BY RANDOM()
		LIMIT 1
	`, userID).Scan(&t.SourceReviewID, &t.TaskID, &t.TaskTitle, &t.TaskStatement, &t.Code, &t.Language)
	if err != nil {
		return nil, fmt.Errorf("get blind review task: %w", err)
	}
	return &t, nil
}

// InsertBlindReviewSession stores a completed blind review session.
func (r *Repo) InsertBlindReviewSession(ctx context.Context, userID, sourceReviewID, taskID uuid.UUID, sourceCode, sourceLang, userReview string, aiScore int32, aiFeedback string) (*model.BlindReviewResult, error) {
	var result model.BlindReviewResult
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
