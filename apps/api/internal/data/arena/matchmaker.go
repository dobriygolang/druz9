package arena

import (
	"context"
	"fmt"
)

// PairQueuedLobbies marks even pairs of queued lobbies with the same mode as
// matched. Returns the count of lobbies that flipped status.
func (r *Repo) PairQueuedLobbies(ctx context.Context) (int64, error) {
	tag, err := r.data.DB.Exec(ctx, `
        WITH ranked AS (
            SELECT id,
                   mode,
                   ROW_NUMBER() OVER (PARTITION BY mode ORDER BY created_at) AS rn,
                   COUNT(*)    OVER (PARTITION BY mode)                       AS total
            FROM arena_lobbies
            WHERE status = 'queued' AND expires_at > NOW()
        )
        UPDATE arena_lobbies
        SET status = 'matched'
        WHERE id IN (
            SELECT id FROM ranked
            WHERE rn <= (total - total % 2)
        )
    `)
	if err != nil {
		return 0, fmt.Errorf("match lobbies: %w", err)
	}
	return tag.RowsAffected(), nil
}
