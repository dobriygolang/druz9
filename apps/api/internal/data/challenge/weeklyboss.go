package challenge

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// WeeklyEntry is a user's submission for the weekly boss challenge.
type WeeklyEntry struct {
	UserID      uuid.UUID `json:"userId"`
	DisplayName string    `json:"displayName"`
	AvatarURL   string    `json:"avatarUrl"`
	AIScore     int32     `json:"aiScore"`
	SolveTimeMs int64     `json:"solveTimeMs"`
	SubmittedAt time.Time `json:"submittedAt"`
}

// WeeklyInfo holds the current weekly challenge metadata.
type WeeklyInfo struct {
	WeekKey   string    `json:"weekKey"`
	TaskID    uuid.UUID `json:"taskId"`
	TaskTitle string    `json:"taskTitle"`
	TaskSlug  string    `json:"taskSlug"`
	Difficulty string   `json:"difficulty"`
	EndsAt    time.Time `json:"endsAt"`
}

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

// UpsertWeeklyEntry records or updates a weekly boss attempt (keeps the best score).
func (r *Repo) UpsertWeeklyEntry(ctx context.Context, userID uuid.UUID, weekKey string, taskID uuid.UUID, aiScore int32, solveTimeMs int64, code, language string) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO weekly_challenge_entries (user_id, week_key, task_id, ai_score, solve_time_ms, code, language, submitted_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		ON CONFLICT (user_id, week_key)
		DO UPDATE SET
			ai_score = CASE WHEN $4 > weekly_challenge_entries.ai_score THEN $4
			                WHEN $4 = weekly_challenge_entries.ai_score AND $5 < weekly_challenge_entries.solve_time_ms THEN $4
			                ELSE weekly_challenge_entries.ai_score END,
			solve_time_ms = CASE WHEN $4 > weekly_challenge_entries.ai_score THEN $5
			                     WHEN $4 = weekly_challenge_entries.ai_score AND $5 < weekly_challenge_entries.solve_time_ms THEN $5
			                     ELSE weekly_challenge_entries.solve_time_ms END,
			code = CASE WHEN $4 > weekly_challenge_entries.ai_score THEN $6
			            WHEN $4 = weekly_challenge_entries.ai_score AND $5 < weekly_challenge_entries.solve_time_ms THEN $6
			            ELSE weekly_challenge_entries.code END,
			language = CASE WHEN $4 > weekly_challenge_entries.ai_score THEN $7
			               WHEN $4 = weekly_challenge_entries.ai_score AND $5 < weekly_challenge_entries.solve_time_ms THEN $7
			               ELSE weekly_challenge_entries.language END,
			submitted_at = NOW()
	`, userID, weekKey, taskID, aiScore, solveTimeMs, code, language)
	if err != nil {
		return fmt.Errorf("upsert weekly entry: %w", err)
	}
	return nil
}

// GetWeeklyLeaderboard returns the top entries for a given week.
func (r *Repo) GetWeeklyLeaderboard(ctx context.Context, weekKey string, limit int) ([]WeeklyEntry, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	rows, err := r.data.DB.Query(ctx, `
		SELECT wce.user_id,
		       COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username, ''),
		       COALESCE(u.avatar_url, ''),
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

	var entries []WeeklyEntry
	for rows.Next() {
		var e WeeklyEntry
		if err := rows.Scan(&e.UserID, &e.DisplayName, &e.AvatarURL, &e.AIScore, &e.SolveTimeMs, &e.SubmittedAt); err != nil {
			return nil, fmt.Errorf("scan weekly entry: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// GetUserWeeklyEntry returns the user's entry for the current week (nil if none).
func (r *Repo) GetUserWeeklyEntry(ctx context.Context, userID uuid.UUID, weekKey string) (*WeeklyEntry, error) {
	var e WeeklyEntry
	err := r.data.DB.QueryRow(ctx, `
		SELECT user_id, '', '', ai_score, solve_time_ms, submitted_at
		FROM weekly_challenge_entries
		WHERE user_id = $1 AND week_key = $2
	`, userID, weekKey).Scan(&e.UserID, &e.DisplayName, &e.AvatarURL, &e.AIScore, &e.SolveTimeMs, &e.SubmittedAt)
	if err != nil {
		return nil, nil
	}
	return &e, nil
}

// CountUserWeeklyAttempts counts weeks where user has at least one entry.
func (r *Repo) CountUserWeeklyAttemptsToday(ctx context.Context, userID uuid.UUID, weekKey string) (int32, error) {
	var count int32
	err := r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*) FROM weekly_challenge_entries
		WHERE user_id = $1 AND week_key = $2
	`, userID, weekKey).Scan(&count)
	if err != nil {
		return 0, nil
	}
	return count, nil
}
