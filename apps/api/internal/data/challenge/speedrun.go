package challenge

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// UpsertTaskRecord (the write path) used to live here alongside the
// RecordSpeedRun RPC. Both were removed as dead; records are now only
// read, and bulk-inserted when the arena finishes a match — see
// app/arena/rating.go. Re-add when a dedicated speed-run submission
// endpoint is needed.

// GetUserRecords returns a user's personal bests, most recent first.
func (r *Repo) GetUserRecords(ctx context.Context, userID uuid.UUID, limit int) ([]model.TaskRecord, error) {
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

	var records []model.TaskRecord
	for rows.Next() {
		var rec model.TaskRecord
		if err := rows.Scan(&rec.TaskID, &rec.TaskTitle, &rec.BestTimeMs, &rec.BestAIScore, &rec.Attempts, &rec.LastAt); err != nil {
			return nil, fmt.Errorf("scan record: %w", err)
		}
		records = append(records, rec)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user records: %w", err)
	}
	return records, nil
}
