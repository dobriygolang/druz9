package podcast

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) PreparePodcastUpload(ctx context.Context, req *v1.PreparePodcastUploadRequest) (*v1.PreparePodcastUploadResponse, error) {
	if _, err := requireUser(ctx); err != nil {
		return nil, err
	}

	podcastID, err := uuid.Parse(req.PodcastId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_PODCAST_ID", "invalid podcast id")
	}

	item, uploadURL, objectKey, err := i.service.PreparePodcastUpload(ctx, podcastID, model.PreparePodcastUploadRequest{
		FileName:        req.FileName,
		ContentType:     req.ContentType,
		DurationSeconds: req.DurationSeconds,
	})
	if err != nil {
		return nil, err
	}

	return &v1.PreparePodcastUploadResponse{
		UploadUrl: uploadURL,
		ObjectKey: objectKey,
		Podcast:   mapPodcast(item),
	}, nil
}
