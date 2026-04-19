package main

import (
	"context"

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
	return a.repo.SavePodcast(ctx, userID, podcastID)
}

func (a podcastSavedAdapter) UnsavePodcast(ctx context.Context, userID, podcastID uuid.UUID) error {
	return a.repo.UnsavePodcast(ctx, userID, podcastID)
}

func (a podcastSavedAdapter) ListSavedPodcasts(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.Podcast, int32, error) {
	return a.repo.ListSavedPodcasts(ctx, userID, limit, offset)
}

func (a podcastSeriesAdapter) ListSeries(ctx context.Context, limit, offset int32) ([]*podcastservice.SeriesRow, int32, error) {
	rows, total, err := a.repo.ListSeries(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	out := make([]*podcastservice.SeriesRow, len(rows))
	for i, s := range rows {
		out[i] = &podcastservice.SeriesRow{
			ID:            s.ID.String(),
			Slug:          s.Slug,
			Title:         s.Title,
			Description:   s.Description,
			CoverRef:      s.CoverRef,
			EpisodeCount:  s.EpisodeCount,
			CreatedAtUnix: s.CreatedAt.Unix(),
		}
	}
	return out, total, nil
}
