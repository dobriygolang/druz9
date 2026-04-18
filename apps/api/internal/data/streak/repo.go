package streak

import (
	"context"
	"fmt"

	streakdomain "api/internal/domain/streak"
	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
)

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(store *postgres.Store, logger log.Logger) *Repo {
	return &Repo{data: store, log: log.NewHelper(logger)}
}

// GetOrCreate reads the user's shield row, creating a zero-row on first access.
func (r *Repo) GetOrCreate(ctx context.Context, userID uuid.UUID) (*streakdomain.ShieldRow, error) {
	if _, err := r.data.DB.Exec(ctx, `
        INSERT INTO user_streak_shields (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
    `, userID); err != nil {
		return nil, fmt.Errorf("upsert streak shields: %w", err)
	}

	var row streakdomain.ShieldRow
	row.UserID = userID
	err := r.data.DB.QueryRow(ctx, `
        SELECT owned_count, last_used_at, last_restored_to, total_purchased, total_used
        FROM user_streak_shields WHERE user_id = $1
    `, userID).Scan(&row.OwnedCount, &row.LastUsedAt, &row.LastRestoredTo, &row.TotalPurchased, &row.TotalUsed)
	if err != nil {
		return nil, fmt.Errorf("load streak shields: %w", err)
	}
	return &row, nil
}

// AddShields increments owned + lifetime purchased counters.
func (r *Repo) AddShields(ctx context.Context, userID uuid.UUID, delta int32) error {
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO user_streak_shields (user_id, owned_count, total_purchased)
        VALUES ($1, $2, $2)
        ON CONFLICT (user_id) DO UPDATE
        SET owned_count = user_streak_shields.owned_count + EXCLUDED.owned_count,
            total_purchased = user_streak_shields.total_purchased + EXCLUDED.total_purchased,
            updated_at = NOW()
    `, userID, delta)
	if err != nil {
		return fmt.Errorf("add shields: %w", err)
	}
	return nil
}

// UseShield decrements owned, records the restore event. Fails if owned=0
// via the CHECK constraint on owned_count.
func (r *Repo) UseShield(ctx context.Context, userID uuid.UUID, restoredTo int32) error {
	tag, err := r.data.DB.Exec(ctx, `
        UPDATE user_streak_shields
        SET owned_count = owned_count - 1,
            total_used = total_used + 1,
            last_used_at = NOW(),
            last_restored_to = $2,
            updated_at = NOW()
        WHERE user_id = $1 AND owned_count > 0
    `, userID, restoredTo)
	if err != nil {
		return fmt.Errorf("use shield: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("use shield: no shields owned")
	}
	return nil
}
