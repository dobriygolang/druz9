package arena

import (
	"context"
	"fmt"
	"time"

	domain "api/internal/domain/arena"
	"api/internal/model"
)

const maxStoredArenaSubmissionTextBytes = 16 * 1024

func (r *Repo) CreateSubmission(ctx context.Context, submission *domain.Submission) (*domain.Submission, error) {
	submission.Output = trimArenaSubmissionText(submission.Output)
	submission.Error = trimArenaSubmissionText(submission.Error)

	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO arena_submissions (
			id,
			match_id,
			user_id,
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
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
	`,
		submission.ID,
		submission.MatchID,
		submission.UserID,
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

func (r *Repo) CleanupOldSubmissions(ctx context.Context, idleFor time.Duration) (int64, error) {
	tag, err := r.data.DB.Exec(ctx, `
		DELETE FROM arena_submissions s
		WHERE s.submitted_at < NOW() - $1::interval
		  AND EXISTS (
		    SELECT 1
		    FROM arena_matches m
		    WHERE m.id = s.match_id
		      AND m.status = $2
		  )
	`, idleFor.String(), model.ArenaMatchStatusFinished)
	if err != nil {
		return 0, fmt.Errorf("cleanup old arena submissions: %w", err)
	}
	return tag.RowsAffected(), nil
}

func trimArenaSubmissionText(value string) string {
	if len(value) <= maxStoredArenaSubmissionTextBytes {
		return value
	}
	const suffix = "\n...[truncated]"
	limit := maxStoredArenaSubmissionTextBytes - len(suffix)
	if limit < 0 {
		limit = 0
	}
	return value[:limit] + suffix
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
