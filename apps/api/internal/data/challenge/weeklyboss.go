package challenge

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/model"
)

var errWeeklyEntryNotFound = errors.New("weekly entry not found")

// GetHardTaskIDs returns the IDs of all active hard tasks.
func (r *Repo) GetHardTaskIDs(ctx context.Context) ([]uuid.UUID, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id FROM code_tasks
		WHERE difficulty = 3 AND is_active = true
		ORDER BY id
	`)
	if err != nil {
		return nil, fmt.Errorf("get hard task ids: %w", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan task id: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// GetTaskInfo returns the title and slug of a task by ID.
func (r *Repo) GetTaskInfo(ctx context.Context, taskID uuid.UUID) (title, slug string, err error) {
	err = r.data.DB.QueryRow(ctx, `
		SELECT title, slug FROM code_tasks WHERE id = $1
	`, taskID).Scan(&title, &slug)
	if err != nil {
		return "", "", fmt.Errorf("get task info: %w", err)
	}
	return title, slug, nil
}

// UpsertWeeklyEntry was the write path for SubmitWeeklyBoss; deleted
// alongside that RPC. The page displays leaderboard + current task
// only — when submissions wire up, reintroduce with a test.

// GetWeeklyLeaderboard returns the top entries for a given week.
func (r *Repo) GetWeeklyLeaderboard(ctx context.Context, weekKey string, limit int) ([]model.WeeklyEntry, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	rows, err := r.data.DB.Query(ctx, `
		SELECT wce.user_id,
		       COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username, ''),
		       COALESCE(NULLIF(u.yandex_avatar_url, ''), NULLIF(u.telegram_avatar_url, ''), ''),
		       wce.ai_score, wce.solve_time_ms, wce.submitted_at
		FROM weekly_challenge_entries wce
		JOIN users u ON u.id = wce.user_id
		WHERE wce.week_key = $1
		ORDER BY wce.ai_score DESC, wce.solve_time_ms ASC
		LIMIT $2
	`, weekKey, limit)
	if err != nil {
		return nil, fmt.Errorf("weekly leaderboard: %w", err)
	}
	defer rows.Close()

	var entries []model.WeeklyEntry
	for rows.Next() {
		var e model.WeeklyEntry
		if err := rows.Scan(&e.UserID, &e.DisplayName, &e.AvatarURL, &e.AIScore, &e.SolveTimeMs, &e.SubmittedAt); err != nil {
			return nil, fmt.Errorf("scan weekly entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// GetUserWeeklyEntry returns the user's entry for the current week (nil if none).
func (r *Repo) GetUserWeeklyEntry(ctx context.Context, userID uuid.UUID, weekKey string) (*model.WeeklyEntry, error) {
	var e model.WeeklyEntry
	err := r.data.DB.QueryRow(ctx, `
		SELECT user_id, '', '', ai_score, solve_time_ms, submitted_at
		FROM weekly_challenge_entries
		WHERE user_id = $1 AND week_key = $2
	`, userID, weekKey).Scan(&e.UserID, &e.DisplayName, &e.AvatarURL, &e.AIScore, &e.SolveTimeMs, &e.SubmittedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errWeeklyEntryNotFound
		}
		return nil, fmt.Errorf("get user weekly entry: %w", err)
	}
	return &e, nil
}
