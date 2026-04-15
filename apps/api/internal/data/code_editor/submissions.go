package code_editor

import (
	"context"
	"fmt"
	"time"

	codeeditordomain "api/internal/domain/codeeditor"

	"github.com/google/uuid"
)

const maxStoredSubmissionTextBytes = 16 * 1024

func (r *Repo) CreateSubmission(ctx context.Context, submission *codeeditordomain.Submission) (*codeeditordomain.Submission, error) {
	submission.Output = trimSubmissionText(submission.Output)
	submission.Error = trimSubmissionText(submission.Error)

	_, err := r.data.DB.Exec(
		ctx,
		`INSERT INTO code_submissions (id, room_id, user_id, guest_name, output, error, submitted_at, duration_ms, is_correct, passed_count, total_count)
		 VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10)`,
		submission.ID, submission.RoomID, submission.UserID, submission.GuestName, submission.Output, submission.Error, submission.DurationMs, submission.IsCorrect, submission.PassedCount, submission.TotalCount,
	)
	if err != nil {
		return nil, fmt.Errorf("create submission: %w", err)
	}
	if _, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET updated_at = NOW() WHERE id = $1`, submission.RoomID); err != nil {
		return nil, fmt.Errorf("touch room after submission: %w", err)
	}
	return submission, nil
}

func (r *Repo) GetSubmissions(ctx context.Context, roomID uuid.UUID) ([]*codeeditordomain.Submission, error) {
	rows, err := r.data.DB.Query(ctx, `SELECT id, room_id, user_id, guest_name, output, error, submitted_at, duration_ms, is_correct, passed_count, total_count FROM code_submissions WHERE room_id = $1 ORDER BY submitted_at ASC`, roomID)
	if err != nil {
		return nil, fmt.Errorf("get submissions: %w", err)
	}
	defer rows.Close()

	var submissions []*codeeditordomain.Submission
	for rows.Next() {
		var s codeeditordomain.Submission
		if err := scanSubmission(rows, &s); err != nil {
			return nil, fmt.Errorf("scan submission: %w", err)
		}
		submissions = append(submissions, &s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate submission rows: %w", err)
	}
	return submissions, nil
}

func (r *Repo) CleanupOldSubmissions(ctx context.Context, idleFor time.Duration) (int64, error) {
	tag, err := r.data.DB.Exec(ctx, `
		DELETE FROM code_submissions cs
		WHERE cs.submitted_at < NOW() - $1::interval
		  AND EXISTS (
		    SELECT 1
		    FROM code_rooms cr
		    WHERE cr.id = cs.room_id
		      AND cr.status IN ($2, $3)
		  )
	`, idleFor.String(), codeeditordomain.RoomStatusWaiting, codeeditordomain.RoomStatusFinished)
	if err != nil {
		return 0, fmt.Errorf("cleanup old submissions: %w", err)
	}
	return tag.RowsAffected(), nil
}

func trimSubmissionText(value string) string {
	if len(value) <= maxStoredSubmissionTextBytes {
		return value
	}
	const suffix = "\n...[truncated]"
	limit := maxStoredSubmissionTextBytes - len(suffix)
	if limit < 0 {
		limit = 0
	}
	return value[:limit] + suffix
}
