package podcast

import (
	"context"
	"errors"
	"time"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"

	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/podcast/v1"
)

// SeriesAdminRepo extends SeriesRepo with editorial writes (ADR-005).
// Wired in bootstrap with a thin adapter.
type SeriesAdminRepo interface {
	CreateSeries(ctx context.Context, slug, title, description, coverRef string) (*SeriesRow, error)
	UpdateSeries(ctx context.Context, id uuid.UUID, title, description, coverRef string) (*SeriesRow, error)
	DeleteSeries(ctx context.Context, id uuid.UUID) error
	ToggleFeatured(ctx context.Context, podcastID uuid.UUID, featured bool) (*time.Time, error)
	GetPodcast(ctx context.Context, podcastID uuid.UUID) (*PodcastWire, error)
}

// PodcastWire is the API-side projection of model.Podcast used by the
// featured-toggle response. Mirror of mapPodcastToProto's input.
type PodcastWire struct {
	ID              string
	Title           string
	AuthorID        string
	AuthorName      string
	DurationSeconds uint32
	ListensCount    uint64
	FileName        string
	IsUploaded      bool
	ContentType     int32
	CreatedAt       time.Time
	FeaturedAt      *time.Time
}

// ErrSeriesSlugTaken is re-exported by the API layer so handlers can
// translate it without depending on the data package directly. Adapter
// at bootstrap maps the data-layer sentinel to this one.
var ErrSeriesSlugTaken = errors.New("podcast series slug already taken")

func (i *Implementation) WithSeriesAdminRepo(r SeriesAdminRepo) *Implementation {
	i.seriesAdmin = r
	return i
}

func seriesRowToProto(s *SeriesRow) *v1.PodcastSeries {
	if s == nil {
		return nil
	}
	out := &v1.PodcastSeries{
		Id:           s.ID,
		Slug:         s.Slug,
		Title:        s.Title,
		Description:  s.Description,
		CoverRef:     s.CoverRef,
		EpisodeCount: uint32(s.EpisodeCount),
	}
	if s.CreatedAtUnix > 0 {
		out.CreatedAt = timestamppb.New(time.Unix(s.CreatedAtUnix, 0).UTC())
	}
	return out
}

func (i *Implementation) adminSeriesAvailable() bool { return i.seriesAdmin != nil }

func (i *Implementation) AdminCreateSeries(ctx context.Context, req *v1.AdminCreateSeriesRequest) (*v1.PodcastSeries, error) {
	if !i.adminSeriesAvailable() {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "series admin repo missing")
	}
	if req.GetSlug() == "" || req.GetTitle() == "" {
		return nil, kratoserrors.BadRequest("INVALID_INPUT", "slug and title are required")
	}
	row, err := i.seriesAdmin.CreateSeries(ctx, req.GetSlug(), req.GetTitle(), req.GetDescription(), req.GetCoverRef())
	if err != nil {
		if errors.Is(err, ErrSeriesSlugTaken) {
			return nil, kratoserrors.Conflict("SLUG_TAKEN", "series slug already in use")
		}
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to create series")
	}
	return seriesRowToProto(row), nil
}

func (i *Implementation) AdminUpdateSeries(ctx context.Context, req *v1.AdminUpdateSeriesRequest) (*v1.PodcastSeries, error) {
	if !i.adminSeriesAvailable() {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "series admin repo missing")
	}
	id, err := uuid.Parse(req.GetSeriesId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_SERIES_ID", "invalid series_id")
	}
	row, err := i.seriesAdmin.UpdateSeries(ctx, id, req.GetTitle(), req.GetDescription(), req.GetCoverRef())
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to update series")
	}
	return seriesRowToProto(row), nil
}

func (i *Implementation) AdminDeleteSeries(ctx context.Context, req *v1.AdminDeleteSeriesRequest) (*v1.PodcastStatusResponse, error) {
	if !i.adminSeriesAvailable() {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "series admin repo missing")
	}
	id, err := uuid.Parse(req.GetSeriesId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_SERIES_ID", "invalid series_id")
	}
	if err := i.seriesAdmin.DeleteSeries(ctx, id); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to delete series")
	}
	return &v1.PodcastStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}

func (i *Implementation) AdminToggleFeatured(ctx context.Context, req *v1.AdminToggleFeaturedRequest) (*v1.Podcast, error) {
	if !i.adminSeriesAvailable() {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "series admin repo missing")
	}
	id, err := uuid.Parse(req.GetPodcastId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_PODCAST_ID", "invalid podcast_id")
	}
	if _, err := i.seriesAdmin.ToggleFeatured(ctx, id, req.GetFeatured()); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to toggle featured")
	}
	p, err := i.seriesAdmin.GetPodcast(ctx, id)
	if err != nil || p == nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to reload podcast")
	}
	out := &v1.Podcast{
		Id:              p.ID,
		Title:           p.Title,
		AuthorId:        p.AuthorID,
		AuthorName:      p.AuthorName,
		DurationSeconds: p.DurationSeconds,
		ListensCount:    p.ListensCount,
		FileName:        p.FileName,
		IsUploaded:      p.IsUploaded,
		ContentType:     v1.MediaContentType(p.ContentType),
		CreatedAt:       timestamppb.New(p.CreatedAt),
	}
	if p.FeaturedAt != nil {
		out.FeaturedAt = timestamppb.New(*p.FeaturedAt)
	}
	return out, nil
}
