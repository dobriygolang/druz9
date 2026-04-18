package podcast

import (
	"context"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"
)

func (i *Implementation) CompletePodcastUpload(ctx context.Context, req *v1.CompletePodcastUploadRequest) (*v1.PodcastResponse, error) {
	if _, err := apihelpers.RequireUser(ctx); err != nil {
		return nil, err
	}

	podcastID, err := apihelpers.ParseUUID(req.GetPodcastId(), "INVALID_PODCAST_ID", "podcast_id")
	if err != nil {
		return nil, err
	}

	item, err := i.service.CompletePodcastUpload(ctx, podcastID, model.CompletePodcastUploadRequest{
		FileName:        req.GetFileName(),
		ContentType:     unmapContentType(req.GetContentType()),
		DurationSeconds: req.GetDurationSeconds(),
		ObjectKey:       req.GetObjectKey(),
	})
	if err != nil {
		return nil, err
	}
	return &v1.PodcastResponse{Podcast: mapPodcast(item)}, nil
}
