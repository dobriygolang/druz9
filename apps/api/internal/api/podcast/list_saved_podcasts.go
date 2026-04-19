package podcast

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"
)

// SavedRepo gives the handler access to user_saved_podcasts. Defined here
// so the API package doesn't import data/.
type SavedRepo interface {
	SavePodcast(ctx context.Context, userID, podcastID uuid.UUID) error
	UnsavePodcast(ctx context.Context, userID, podcastID uuid.UUID) error
	ListSavedPodcasts(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.Podcast, int32, error)
}

// WithSavedRepo wires user_saved_podcasts (ADR-005). Optional.
func (i *Implementation) WithSavedRepo(r SavedRepo) *Implementation {
	i.saved = r
	return i
}

func (i *Implementation) ListSavedPodcasts(ctx context.Context, req *v1.ListSavedPodcastsRequest) (*v1.ListPodcastsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	if i.saved == nil {
		return &v1.ListPodcastsResponse{}, nil
	}
	limit := int32(req.GetLimit())
	if limit <= 0 || limit > model.MaxPodcastsLimit {
		limit = model.DefaultPodcastsLimit
	}
	offset := int32(req.GetOffset())

	rows, total, err := i.saved.ListSavedPodcasts(ctx, user.ID, limit, offset)
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to list saved podcasts")
	}
	out := make([]*v1.Podcast, len(rows))
	for idx, p := range rows {
		out[idx] = mapPodcastToProto(p)
	}
	return &v1.ListPodcastsResponse{
		Podcasts:    out,
		Limit:       limit,
		Offset:      offset,
		TotalCount:  total,
		HasNextPage: offset+limit < total,
	}, nil
}

// mapPodcastToProto converts a model.Podcast into the wire shape.
// Duplicated locally (instead of touching the existing list_podcasts
// handler) to avoid disturbing tests around the canonical mapper.
func mapPodcastToProto(p *model.Podcast) *v1.Podcast {
	if p == nil {
		return nil
	}
	return &v1.Podcast{
		Id:              p.ID.String(),
		Title:           p.Title,
		AuthorId:        p.AuthorID,
		AuthorName:      p.AuthorName,
		DurationSeconds: uint32(p.DurationSeconds),
		ListensCount:    uint64(p.ListensCount),
		FileName:        p.FileName,
		IsUploaded:      p.ObjectKey != "",
		ContentType:     v1.MediaContentType(p.ContentType),
		CreatedAt:       timestamppb.New(p.CreatedAt),
	}
}
