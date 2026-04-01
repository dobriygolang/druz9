package code_editor

import (
	"context"
	"fmt"

	codeeditordomain "api/internal/domain/codeeditor"

	"github.com/google/uuid"
)

func (r *Repo) CreateSubmission(ctx context.Context, submission *codeeditordomain.Submission) (*codeeditordomain.Submission, error) {
	_, err := r.data.DB.Exec(
		ctx,
		`INSERT INTO code_submissions (id, room_id, user_id, guest_name, code, output, error, submitted_at, duration_ms, is_correct, passed_count, total_count)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11)`,
		submission.ID, submission.RoomID, submission.UserID, submission.GuestName, submission.Code, submission.Output, submission.Error, submission.DurationMs, submission.IsCorrect, submission.PassedCount, submission.TotalCount,
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
	rows, err := r.data.DB.Query(ctx, `SELECT id, room_id, user_id, guest_name, code, output, error, submitted_at, duration_ms, is_correct, passed_count, total_count FROM code_submissions WHERE room_id = $1 ORDER BY submitted_at ASC`, roomID)
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
	return submissions, nil
}
