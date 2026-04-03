package interviewprep

import (
	"context"
	"errors"
	"fmt"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) CreateCheckpoint(ctx context.Context, checkpoint *model.InterviewPrepCheckpoint) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO interview_prep_checkpoints (
			id, user_id, task_id, session_id, skill_key, status, duration_seconds,
			attempts_used, max_attempts, score, started_at, finished_at, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
	`,
		checkpoint.ID,
		checkpoint.UserID,
		checkpoint.TaskID,
		checkpoint.SessionID,
		checkpoint.SkillKey,
		checkpoint.Status.String(),
		checkpoint.DurationSeconds,
		checkpoint.AttemptsUsed,
		checkpoint.MaxAttempts,
		checkpoint.Score,
		checkpoint.StartedAt,
		checkpoint.FinishedAt,
		checkpoint.CreatedAt,
		checkpoint.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create interview prep checkpoint: %w", err)
	}
	return nil
}

func (r *Repo) GetCheckpointBySessionID(ctx context.Context, sessionID uuid.UUID) (*model.InterviewPrepCheckpoint, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT
			id, user_id, task_id, session_id, skill_key, status, duration_seconds,
			attempts_used, max_attempts, score, started_at, finished_at, created_at, updated_at
		FROM interview_prep_checkpoints
		WHERE session_id = $1
	`, sessionID)

	item, err := scanCheckpoint(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get interview prep checkpoint: %w", err)
	}
	return item, nil
}

func (r *Repo) GetActiveCheckpointByUserAndTask(ctx context.Context, userID, taskID uuid.UUID) (*model.InterviewPrepCheckpoint, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT
			id, user_id, task_id, session_id, skill_key, status, duration_seconds,
			attempts_used, max_attempts, score, started_at, finished_at, created_at, updated_at
		FROM interview_prep_checkpoints
		WHERE user_id = $1 AND task_id = $2 AND status = $3
		ORDER BY updated_at DESC
		LIMIT 1
	`, userID, taskID, model.InterviewPrepCheckpointStatusActive.String())

	item, err := scanCheckpoint(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get active interview prep checkpoint: %w", err)
	}
	return item, nil
}

func (r *Repo) UpdateCheckpointState(
	ctx context.Context,
	checkpointID uuid.UUID,
	status model.InterviewPrepCheckpointStatus,
	attemptsUsed int32,
	score int32,
	finishedAt *time.Time,
) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_checkpoints
		SET status = $2,
		    attempts_used = $3,
		    score = $4,
		    finished_at = $5,
		    updated_at = NOW()
		WHERE id = $1
	`, checkpointID, status.String(), attemptsUsed, score, finishedAt)
	if err != nil {
		return fmt.Errorf("update interview prep checkpoint: %w", err)
	}
	return nil
}
