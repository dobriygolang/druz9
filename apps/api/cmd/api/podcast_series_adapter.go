package main

import (
	"context"

	podcastservice "api/internal/api/podcast"
	podcastdata "api/internal/data/podcast"
)

// podcastSeriesAdapter bridges data/podcast.Repo to the API-side
// SeriesRepo contract so the handler stays decoupled from data/.
type podcastSeriesAdapter struct {
	repo *podcastdata.Repo
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
