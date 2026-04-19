package profile

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
)

var errTourIDRequired = errors.New("mark tour completed: tour_id required")

// ListCompletedTours returns the tour_id values the user has finished.
// Order: most-recently-completed first.
func (r *Repo) ListCompletedTours(ctx context.Context, userID uuid.UUID) ([]string, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT tour_id FROM user_tours WHERE user_id = $1 ORDER BY completed_at DESC
    `, userID)
	if err != nil {
		return nil, fmt.Errorf("list completed tours: %w", err)
	}
	defer rows.Close()
	out := make([]string, 0, 8)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan tour: %w", err)
		}
		out = append(out, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate tours: %w", err)
	}
	return out, nil
}

// MarkTourCompleted is idempotent: re-marking the same tour just refreshes
// the timestamp.
func (r *Repo) MarkTourCompleted(ctx context.Context, userID uuid.UUID, tourID string) error {
	if tourID == "" {
		return fmt.Errorf("mark tour completed: tour_id required: %w", errTourIDRequired)
	}
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO user_tours (user_id, tour_id) VALUES ($1, $2)
        ON CONFLICT (user_id, tour_id) DO UPDATE SET completed_at = NOW()
    `, userID, tourID)
	if err != nil {
		return fmt.Errorf("mark tour completed: %w", err)
	}
	return nil
}
