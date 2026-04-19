package streak

import (
	"context"
	"fmt"
)

func (r *Repo) ListWarningUserIDs(ctx context.Context, limit int32) ([]string, error) {
	rows, err := r.data.DB.Query(ctx, `
		WITH activity AS (
			SELECT user_id, DATE(finished_at AT TIME ZONE 'UTC') AS d
			FROM interview_mock_sessions WHERE status = 'finished'
			  AND finished_at >= CURRENT_DATE - 1
			UNION
			SELECT user_id, DATE(finished_at AT TIME ZONE 'UTC') AS d
			FROM interview_practice_sessions WHERE status = 'finished'
			  AND finished_at >= CURRENT_DATE - 1
		)
		SELECT DISTINCT a.user_id
		FROM activity a
		WHERE a.d = CURRENT_DATE - 1
		  AND a.user_id NOT IN (SELECT user_id FROM activity WHERE d = CURRENT_DATE)
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("streak warning query: %w", err)
	}
	defer rows.Close()

	var out []string
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			return nil, fmt.Errorf("scan streak warning user: %w", err)
		}
		out = append(out, userID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate streak warning users: %w", err)
	}
	return out, nil
}
