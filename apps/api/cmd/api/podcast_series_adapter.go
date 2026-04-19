package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	podcastservice "api/internal/api/podcast"
	podcastdata "api/internal/data/podcast"
	"api/internal/model"
)

// podcastSeriesAdapter bridges data/podcast.Repo to the API-side
// SeriesRepo contract so the handler stays decoupled from data/.
type podcastSeriesAdapter struct {
	repo *podcastdata.Repo
}

// podcastSavedAdapter satisfies podcastservice.SavedRepo. The data layer
// already exposes the right shape (uuid + model.Podcast), so this is a
// trivial pass-through.
type podcastSavedAdapter struct {
	repo *podcastdata.Repo
}

func (a podcastSavedAdapter) SavePodcast(ctx context.Context, userID, podcastID uuid.UUID) error {
	if err := a.repo.SavePodcast(ctx, userID, podcastID); err != nil {
		return fmt.Errorf("save podcast: %w", err)
	}
	return nil
}

func (a podcastSavedAdapter) UnsavePodcast(ctx context.Context, userID, podcastID uuid.UUID) error {
	if err := a.repo.UnsavePodcast(ctx, userID, podcastID); err != nil {
		return fmt.Errorf("unsave podcast: %w", err)
	}
	return nil
}

func (a podcastSavedAdapter) ListSavedPodcasts(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.Podcast, int32, error) {
	out, total, err := a.repo.ListSavedPodcasts(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list saved podcasts: %w", err)
	}
	return out, total, nil
}

func (a podcastSeriesAdapter) ListSeries(ctx context.Context, limit, offset int32) ([]*podcastservice.SeriesRow, int32, error) {
	rows, total, err := a.repo.ListSeries(ctx, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list series: %w", err)
	}
	out := make([]*podcastservice.SeriesRow, len(rows))
	for i, s := range rows {
		out[i] = toSeriesRow(s)
	}
	return out, total, nil
}

func toSeriesRow(s *podcastdata.Series) *podcastservice.SeriesRow {
	if s == nil {
		return nil
	}
	return &podcastservice.SeriesRow{
		ID:            s.ID.String(),
		Slug:          s.Slug,
		Title:         s.Title,
		Description:   s.Description,
		CoverRef:      s.CoverRef,
		EpisodeCount:  s.EpisodeCount,
		CreatedAtUnix: s.CreatedAt.Unix(),
	}
}

// podcastSeriesAdminAdapter implements podcastservice.SeriesAdminRepo. It
// translates the data-layer slug-collision sentinel into the API-layer
// counterpart so handlers stay free of pgx imports.
type podcastSeriesAdminAdapter struct {
	repo *podcastdata.Repo
}

func (a podcastSeriesAdminAdapter) CreateSeries(ctx context.Context, slug, title, description, coverRef string) (*podcastservice.SeriesRow, error) {
	row, err := a.repo.CreateSeries(ctx, slug, title, description, coverRef)
	if err != nil {
		if errors.Is(err, podcastdata.ErrSeriesSlugTaken) {
			return nil, podcastservice.ErrSeriesSlugTaken
		}
		return nil, fmt.Errorf("create series: %w", err)
	}
	return toSeriesRow(row), nil
}

func (a podcastSeriesAdminAdapter) UpdateSeries(ctx context.Context, id uuid.UUID, title, description, coverRef string) (*podcastservice.SeriesRow, error) {
	row, err := a.repo.UpdateSeries(ctx, id, title, description, coverRef)
	if err != nil {
		return nil, fmt.Errorf("update series: %w", err)
	}
	return toSeriesRow(row), nil
}

func (a podcastSeriesAdminAdapter) DeleteSeries(ctx context.Context, id uuid.UUID) error {
	if err := a.repo.DeleteSeries(ctx, id); err != nil {
		return fmt.Errorf("delete series: %w", err)
	}
	return nil
}

func (a podcastSeriesAdminAdapter) ToggleFeatured(ctx context.Context, podcastID uuid.UUID, featured bool) (*time.Time, error) {
	ts, err := a.repo.ToggleFeatured(ctx, podcastID, featured)
	if err != nil {
		return nil, fmt.Errorf("toggle featured: %w", err)
	}
	return ts, nil
}

func (a podcastSeriesAdminAdapter) GetPodcast(ctx context.Context, podcastID uuid.UUID) (*podcastservice.PodcastWire, error) {
	p, err := a.repo.GetPodcast(ctx, podcastID)
	if err != nil {
		return nil, fmt.Errorf("get podcast: %w", err)
	}
	if p == nil {
		return nil, nil
	}
	return &podcastservice.PodcastWire{
		ID:              p.ID.String(),
		Title:           p.Title,
		AuthorID:        p.AuthorID,
		AuthorName:      p.AuthorName,
		DurationSeconds: p.DurationSeconds,
		ListensCount:    p.ListensCount,
		FileName:        p.FileName,
		IsUploaded:      p.ObjectKey != "",
		ContentType:     int32(p.ContentType),
		CreatedAt:       p.CreatedAt,
	}, nil
}

// Compile-time interface check.
var (
	_ podcastservice.SeriesAdminRepo = podcastSeriesAdminAdapter{}
	_ podcastservice.SeriesRepo      = podcastSeriesAdapter{}
	_ podcastservice.SavedRepo       = podcastSavedAdapter{}
)
