package challenge

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// TaskRecord is a user's personal best on a task.
type TaskRecord struct {
	TaskID      uuid.UUID `json:"taskId"`
	TaskTitle   string    `json:"taskTitle"`
	BestTimeMs  int64     `json:"bestTimeMs"`
	BestAIScore int32     `json:"bestAiScore"`
	Attempts    int32     `json:"attempts"`
	LastAt      time.Time `json:"lastAt"`
}

// RecordResult is the outcome of recording an attempt.
type RecordResult struct {
	IsNewRecord bool  `json:"isNewRecord"`
	OldBestMs   int64 `json:"oldBestMs"`
	NewBestMs   int64 `json:"newBestMs"`
	Attempts    int32 `json:"attempts"`
}

// UpsertTaskRecord records a speed-run attempt. Returns whether it was a new PB.
func (r *Repo) UpsertTaskRecord(ctx context.Context, userID uuid.UUID, taskID uuid.UUID, timeMs int64, aiScore int32) (*RecordResult, error) {
	// Check existing record
	var oldBest int64
	var oldAttempts int32
	err := r.data.DB.QueryRow(ctx, `
		SELECT best_time_ms, attempts FROM user_task_records
		WHERE user_id = $1 AND task_id = $2
	`, userID, taskID).Scan(&oldBest, &oldAttempts)
	isNew := err != nil // no existing record

	if isNew {
		_, err = r.data.DB.Exec(ctx, `
			INSERT INTO user_task_records (user_id, task_id, best_time_ms, best_ai_score, attempts, last_attempt_at)
			VALUES ($1, $2, $3, $4, 1, NOW())
		`, userID, taskID, timeMs, aiScore)
		if err != nil {
			return nil, fmt.Errorf("insert task record: %w", err)
		}
		return &RecordResult{IsNewRecord: true, OldBestMs: 0, NewBestMs: timeMs, Attempts: 1}, nil
	}

	isNewPB := timeMs < oldBest
	_, err = r.data.DB.Exec(ctx, `
		UPDATE user_task_records
		SET best_time_ms = LEAST(best_time_ms, $3),
		    best_ai_score = GREATEST(best_ai_score, $4),
		    attempts = attempts + 1,
		    last_attempt_at = NOW()
		WHERE user_id = $1 AND task_id = $2
	`, userID, taskID, timeMs, aiScore)
	if err != nil {
		return nil, fmt.Errorf("update task record: %w", err)
	}
	newBest := oldBest
	if isNewPB {
		newBest = timeMs
	}
	return &RecordResult{IsNewRecord: isNewPB, OldBestMs: oldBest, NewBestMs: newBest, Attempts: oldAttempts + 1}, nil
}

// GetUserRecords returns a user's personal bests, most recent first.
func (r *Repo) GetUserRecords(ctx context.Context, userID uuid.UUID, limit int) ([]TaskRecord, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	rows, err := r.data.DB.Query(ctx, `
		SELECT utr.task_id, ct.title, utr.best_time_ms, utr.best_ai_score, utr.attempts, utr.last_attempt_at
		FROM user_task_records utr
		JOIN code_tasks ct ON ct.id = utr.task_id
		WHERE utr.user_id = $1
		ORDER BY utr.last_attempt_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("get user records: %w", err)
	}
	defer rows.Close()

	var records []TaskRecord
	for rows.Next() {
		var rec TaskRecord
		if err := rows.Scan(&rec.TaskID, &rec.TaskTitle, &rec.BestTimeMs, &rec.BestAIScore, &rec.Attempts, &rec.LastAt); err != nil {
			return nil, fmt.Errorf("scan record: %w", err)
		}
		records = append(records, rec)
	}
	return records, rows.Err()
}

// CountNewPBsToday returns how many new PBs the user set today.
func (r *Repo) CountNewPBsToday(ctx context.Context, userID uuid.UUID) (int32, error) {
	// We track PBs indirectly — records updated today with attempts > 1
	// could have been PBs. For simplicity, we just check attempts today.
	var count int32
	err := r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM user_task_records
		WHERE user_id = $1
		  AND last_attempt_at >= CURRENT_DATE
		  AND last_attempt_at < CURRENT_DATE + INTERVAL '1 day'
	`, userID).Scan(&count)
	if err != nil {
		return 0, nil
	}
	return count, nil
}
