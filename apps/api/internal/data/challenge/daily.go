package challenge

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// DailyResult represents a user's daily challenge AI score.
type DailyResult struct {
	UserID        uuid.UUID `json:"userId"`
	DisplayName   string    `json:"displayName"`
	AvatarURL     string    `json:"avatarUrl"`
	AIScore       int32     `json:"aiScore"`
	SubmittedAt   time.Time `json:"submittedAt"`
}

// UpsertDailyResult records or updates a daily challenge AI score.
func (r *Repo) UpsertDailyResult(ctx context.Context, userID uuid.UUID, taskID uuid.UUID, aiScore int32) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO daily_challenge_results (user_id, challenge_date, task_id, ai_score, submitted_at)
		VALUES ($1, CURRENT_DATE, $2, $3, NOW())
		ON CONFLICT (user_id, challenge_date)
		DO UPDATE SET ai_score = GREATEST(daily_challenge_results.ai_score, $3),
		              submitted_at = NOW()
	`, userID, taskID, aiScore)
	if err != nil {
		return fmt.Errorf("upsert daily result: %w", err)
	}
	return nil
}

// GetDailyLeaderboard returns top users for today by AI score.
func (r *Repo) GetDailyLeaderboard(ctx context.Context, limit int) ([]DailyResult, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	rows, err := r.data.DB.Query(ctx, `
		SELECT dcr.user_id, COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.username, ''),
		       COALESCE(u.avatar_url, ''), dcr.ai_score, dcr.submitted_at
		FROM daily_challenge_results dcr
		JOIN users u ON u.id = dcr.user_id
		WHERE dcr.challenge_date = CURRENT_DATE
		ORDER BY dcr.ai_score DESC, dcr.submitted_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("daily leaderboard: %w", err)
	}
	defer rows.Close()

	var results []DailyResult
	for rows.Next() {
		var r DailyResult
		if err := rows.Scan(&r.UserID, &r.DisplayName, &r.AvatarURL, &r.AIScore, &r.SubmittedAt); err != nil {
			return nil, fmt.Errorf("scan daily result: %w", err)
		}
		results = append(results, r)
	}
	return results, rows.Err()
}

// GetUserDailyScore returns the user's best AI score for today (0 if none).
func (r *Repo) GetUserDailyScore(ctx context.Context, userID uuid.UUID) (int32, error) {
	var score int32
	err := r.data.DB.QueryRow(ctx, `
		SELECT COALESCE(ai_score, 0)
		FROM daily_challenge_results
		WHERE user_id = $1 AND challenge_date = CURRENT_DATE
	`, userID).Scan(&score)
	if err != nil {
		return 0, nil // no result yet
	}
	return score, nil
}
