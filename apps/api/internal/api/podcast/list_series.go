package podcast

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"google.golang.org/protobuf/types/known/timestamppb"

	v1 "api/pkg/api/podcast/v1"
)

// SeriesRepo lets the podcast handler read podcast_series without a hard
// dep on the data package (matches the SceneRepo / PreferencesRepository
// patterns used elsewhere).
type SeriesRepo interface {
	ListSeries(ctx context.Context, limit, offset int32) ([]*SeriesRow, int32, error)
}

// SeriesRow is the API-side shape returned by SeriesRepo. Wired in
// bootstrap with a thin adapter (mirrors PreferencesRow).
type SeriesRow struct {
	ID, Slug, Title, Description, CoverRef string
	EpisodeCount                           int32
	CreatedAtUnix                          int64
}

// WithSeriesRepo wires the podcast_series catalog (ADR-005). Optional.
func (i *Implementation) WithSeriesRepo(r SeriesRepo) *Implementation {
	i.series = r
	return i
}

// ListSeries — ADR-005. Returns an empty list when the repo isn't wired
// (frontend treats it as "no series yet" rather than 500).
func (i *Implementation) ListSeries(ctx context.Context, req *v1.ListSeriesRequest) (*v1.ListSeriesResponse, error) {
	if i.series == nil {
		return &v1.ListSeriesResponse{}, nil
	}
	rows, total, err := i.series.ListSeries(ctx, int32(req.GetLimit()), int32(req.GetOffset()))
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to list series")
	}
	out := make([]*v1.PodcastSeries, len(rows))
	for idx, s := range rows {
		out[idx] = &v1.PodcastSeries{
			Id:           s.ID,
			Slug:         s.Slug,
			Title:        s.Title,
			Description:  s.Description,
			CoverRef:     s.CoverRef,
			EpisodeCount: uint32(s.EpisodeCount),
			CreatedAt:    timestamppb.New(unixToTime(s.CreatedAtUnix)),
		}
	}
	return &v1.ListSeriesResponse{Series: out, Total: uint32(total)}, nil
}
