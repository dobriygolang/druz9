package social

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// SearchUsers returns up to limit users whose username, first_name, or
// last_name ILIKE the query prefix. Each hit is annotated with whether the
// viewer is already friends and whether a pending request was sent.
func (r *Repo) SearchUsers(ctx context.Context, viewerID uuid.UUID, query string, limit int32) ([]*model.UserHit, error) {
	pattern := query + "%"
	rows, err := r.data.DB.Query(ctx, `
        SELECT
            u.id::text,
            COALESCE(u.username, '')                                                        AS username,
            TRIM(CONCAT_WS(' ', u.first_name, u.last_name))                                AS display_name,
            COALESCE(NULLIF(u.yandex_avatar_url, ''), NULLIF(u.telegram_avatar_url, ''), '') AS avatar_url,
            EXISTS(
                SELECT 1 FROM friendships f
                WHERE ($1 = f.user_a AND u.id = f.user_b)
                   OR ($1 = f.user_b AND u.id = f.user_a)
            ) AS is_friend,
            EXISTS(
                SELECT 1 FROM friend_requests fr
                WHERE fr.from_user_id = $1 AND fr.to_user_id = u.id AND fr.status = 1
            ) AS request_sent
        FROM users u
        WHERE u.id <> $1
          AND u.status = 2
          AND (
              u.username ILIKE $2
              OR u.first_name ILIKE $2
              OR u.last_name ILIKE $2
          )
        ORDER BY u.last_active_at DESC NULLS LAST
        LIMIT $3
    `, viewerID, pattern, limit)
	if err != nil {
		return nil, fmt.Errorf("search users: %w", err)
	}
	defer rows.Close()

	hits := make([]*model.UserHit, 0, limit)
	for rows.Next() {
		h := &model.UserHit{}
		if err := rows.Scan(&h.UserID, &h.Username, &h.DisplayName, &h.AvatarURL, &h.IsFriend, &h.RequestSent); err != nil {
			return nil, fmt.Errorf("scan user hit: %w", err)
		}
		hits = append(hits, h)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate search results: %w", err)
	}
	return hits, nil
}
