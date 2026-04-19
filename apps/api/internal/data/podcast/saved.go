package podcast

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// SavePodcast inserts (user, podcast). Idempotent: ON CONFLICT DO NOTHING
// so calling twice is safe.
func (r *Repo) SavePodcast(ctx context.Context, userID, podcastID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO user_saved_podcasts (user_id, podcast_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, podcast_id) DO NOTHING
    `, userID, podcastID)
	if err != nil {
		return fmt.Errorf("save podcast: %w", err)
	}
	return nil
}

// UnsavePodcast removes the row. No error if it didn't exist (also idempotent).
func (r *Repo) UnsavePodcast(ctx context.Context, userID, podcastID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `
        DELETE FROM user_saved_podcasts WHERE user_id = $1 AND podcast_id = $2
    `, userID, podcastID)
	if err != nil {
		return fmt.Errorf("unsave podcast: %w", err)
	}
	return nil
}

// ListSavedPodcasts returns the user's saved episodes ordered by save time
// (newest first). Uses the same scanPodcast plumbing as ListPodcasts so
// the caller gets the full Podcast model.
func (r *Repo) ListSavedPodcasts(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.Podcast, int32, error) {
	if limit <= 0 || limit > model.MaxPodcastsLimit {
		limit = model.DefaultPodcastsLimit
	}

	var total int32
	if err := r.data.DB.QueryRow(ctx, `SELECT COUNT(*) FROM user_saved_podcasts WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count saved podcasts: %w", err)
	}

	rows, err := r.data.DB.Query(ctx, fmt.Sprintf(`
        SELECT %s
        FROM podcasts p
        JOIN user_saved_podcasts s ON s.podcast_id = p.id
        WHERE s.user_id = $1
          AND p.object_key IS NOT NULL AND p.object_key <> ''
        ORDER BY s.saved_at DESC
        LIMIT $2 OFFSET $3
    `, podcastColumnsAliased("p")), userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("query saved podcasts: %w", err)
	}
	defer rows.Close()

	out := make([]*model.Podcast, 0, limit)
	for rows.Next() {
		p, err := scanPodcast(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate saved podcasts: %w", err)
	}
	return out, total, nil
}

// podcastColumnsAliased rewrites the canonical column list to qualify
// each column with the given alias — needed when JOIN'ing tables that
// share column names (e.g. `created_at` exists on both).
func podcastColumnsAliased(alias string) string {
	// Mirror the layout in podcastColumns but prefix with alias.
	return alias + ".id, " +
		alias + ".title, COALESCE(" + alias + ".author_id::text, ''), " +
		alias + ".author_name, " + alias + ".duration_seconds, " +
		alias + ".listens_count, COALESCE(" + alias + ".file_name, ''), " +
		"COALESCE(" + alias + ".content_type, 0), COALESCE(" + alias + ".object_key, ''), " +
		alias + ".created_at, " + alias + ".updated_at"
}
