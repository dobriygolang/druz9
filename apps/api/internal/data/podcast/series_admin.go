package podcast

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// CreateSeries inserts a new podcast_series row. Slug is unique; returns
// the slug-collision case as ErrSeriesSlugTaken so handlers can map it
// to 409 Conflict.
var (
	ErrSeriesSlugTaken    = errors.New("podcast series slug already taken")
	ErrSeriesFieldsRequired = errors.New("create series: slug and title required")
	ErrSeriesNotFound      = errors.New("series not found")
)

func (r *Repo) CreateSeries(ctx context.Context, slug, title, description, coverRef string) (*Series, error) {
	if slug == "" || title == "" {
		return nil, fmt.Errorf("create series: %w", ErrSeriesFieldsRequired)
	}
	row := r.data.DB.QueryRow(ctx, `
        INSERT INTO podcast_series (slug, title, description, cover_ref)
        VALUES ($1, $2, $3, $4)
        RETURNING id, slug, title, description, cover_ref, created_at
    `, slug, title, description, coverRef)
	s := &Series{}
	if err := row.Scan(&s.ID, &s.Slug, &s.Title, &s.Description, &s.CoverRef, &s.CreatedAt); err != nil {
		// pgx returns 23505 for unique violation; cheap string check
		// keeps us off pgconn types in the data layer.
		if pgErr := err.Error(); contains(pgErr, "podcast_series_slug_key") {
			return nil, ErrSeriesSlugTaken
		}
		return nil, fmt.Errorf("create series: %w", err)
	}
	return s, nil
}

func (r *Repo) UpdateSeries(ctx context.Context, id uuid.UUID, title, description, coverRef string) (*Series, error) {
	row := r.data.DB.QueryRow(ctx, `
        UPDATE podcast_series
        SET title       = COALESCE(NULLIF($2, ''), title),
            description = COALESCE(NULLIF($3, ''), description),
            cover_ref   = COALESCE(NULLIF($4, ''), cover_ref)
        WHERE id = $1
        RETURNING id, slug, title, description, cover_ref, created_at
    `, id, title, description, coverRef)
	s := &Series{}
	if err := row.Scan(&s.ID, &s.Slug, &s.Title, &s.Description, &s.CoverRef, &s.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("update series: %w", ErrSeriesNotFound)
		}
		return nil, fmt.Errorf("update series: %w", err)
	}
	return s, nil
}

func (r *Repo) DeleteSeries(ctx context.Context, id uuid.UUID) error {
	tag, err := r.data.DB.Exec(ctx, `DELETE FROM podcast_series WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete series: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("delete series: %w", ErrSeriesNotFound)
	}
	return nil
}

// ToggleFeatured sets podcasts.featured_at to NOW() (when featured) or
// NULL (when not). Returns the updated created_at + the timestamp set so
// callers can show "featured since X".
func (r *Repo) ToggleFeatured(ctx context.Context, podcastID uuid.UUID, featured bool) (*time.Time, error) {
	var featuredAt *time.Time
	if featured {
		row := r.data.DB.QueryRow(ctx, `
            UPDATE podcasts SET featured_at = NOW() WHERE id = $1 RETURNING featured_at
        `, podcastID)
		var ts time.Time
		if err := row.Scan(&ts); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, fmt.Errorf("toggle featured: %w", ErrSeriesNotFound)
			}
			return nil, fmt.Errorf("toggle featured: %w", err)
		}
		featuredAt = &ts
	} else {
		_, err := r.data.DB.Exec(ctx, `UPDATE podcasts SET featured_at = NULL WHERE id = $1`, podcastID)
		if err != nil {
			return nil, fmt.Errorf("toggle featured: %w", err)
		}
	}
	return featuredAt, nil
}

func contains(haystack, needle string) bool {
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return true
		}
	}
	return false
}
