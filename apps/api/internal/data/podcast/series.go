package podcast

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Series mirrors the podcast_series table (ADR-005).
type Series struct {
	ID           uuid.UUID
	Slug         string
	Title        string
	Description  string
	CoverRef     string
	EpisodeCount int32
	CreatedAt    time.Time
}

// ListSeries returns the series catalog with episode counts. Sorted by
// title for stable rendering.
func (r *Repo) ListSeries(ctx context.Context, limit, offset int32) ([]*Series, int32, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	var total int32
	if err := r.data.DB.QueryRow(ctx, `SELECT COUNT(*) FROM podcast_series`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count podcast_series: %w", err)
	}

	rows, err := r.data.DB.Query(ctx, `
        SELECT s.id, s.slug, s.title, s.description, s.cover_ref, s.created_at,
               COALESCE(COUNT(p.id) FILTER (WHERE p.object_key IS NOT NULL AND p.object_key <> ''), 0) AS episode_count
        FROM podcast_series s
        LEFT JOIN podcasts p ON p.series_id = s.id
        GROUP BY s.id
        ORDER BY s.title ASC
        LIMIT $1 OFFSET $2
    `, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list podcast_series: %w", err)
	}
	defer rows.Close()

	out := make([]*Series, 0, limit)
	for rows.Next() {
		s := &Series{}
		if err := rows.Scan(&s.ID, &s.Slug, &s.Title, &s.Description, &s.CoverRef, &s.CreatedAt, &s.EpisodeCount); err != nil {
			return nil, 0, fmt.Errorf("scan podcast_series: %w", err)
		}
		out = append(out, s)
	}
	return out, total, rows.Err()
}
