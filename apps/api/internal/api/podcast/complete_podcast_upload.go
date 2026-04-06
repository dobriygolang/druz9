package podcast

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) CompletePodcastUpload(ctx context.Context, req *v1.CompletePodcastUploadRequest) (*v1.PodcastResponse, error) {
	if _, err := requireUser(ctx); err != nil {
		return nil, err
	}

	podcastID, err := uuid.Parse(req.PodcastId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_PODCAST_ID", "invalid podcast id")
	}

	item, err := i.service.CompletePodcastUpload(ctx, podcastID, model.CompletePodcastUploadRequest{
		FileName:        req.FileName,
		ContentType:     unmapContentType(req.ContentType),
		DurationSeconds: req.DurationSeconds,
		ObjectKey:       req.ObjectKey,
	})
	if err != nil {
		return nil, err
	}
	return &v1.PodcastResponse{Podcast: mapPodcast(item)}, nil
}
