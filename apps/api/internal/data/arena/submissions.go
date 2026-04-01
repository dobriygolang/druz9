package arena

import (
	"context"
	"fmt"

	domain "api/internal/domain/arena"
)

func (r *Repo) CreateSubmission(ctx context.Context, submission *domain.Submission) (*domain.Submission, error) {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO arena_submissions (
			id,
			match_id,
			user_id,
			code,
			output,
			error,
			runtime_ms,
			is_correct,
			passed_count,
			total_count,
			failed_test_index,
			failure_kind,
			submitted_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
	`,
		submission.ID,
		submission.MatchID,
		submission.UserID,
		submission.Code,
		submission.Output,
		submission.Error,
		submission.RuntimeMs,
		submission.IsCorrect,
		submission.PassedCount,
		submission.TotalCount,
		submission.FailedTestIndex,
		submission.FailureKind,
	)
	if err != nil {
		return nil, fmt.Errorf("create arena submission: %w", err)
	}
	if _, err := r.data.DB.Exec(ctx, `UPDATE arena_matches SET updated_at = NOW() WHERE id = $1`, submission.MatchID); err != nil {
		return nil, fmt.Errorf("touch arena match after submission: %w", err)
	}
	return submission, nil
}

func (r *Repo) CreateRatingPenalty(ctx context.Context, penalty *domain.RatingPenalty) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO arena_rating_penalties (id, match_id, user_id, reason, delta_rating, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT DO NOTHING
	`, penalty.ID, penalty.MatchID, penalty.UserID, penalty.Reason, penalty.DeltaRating, penalty.CreatedAt)
	if err != nil {
		return fmt.Errorf("create arena rating penalty: %w", err)
	}
	return nil
}
