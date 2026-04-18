package podcast

import (
	"context"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"
)

func (i *Implementation) PreparePodcastUpload(ctx context.Context, req *v1.PreparePodcastUploadRequest) (*v1.PreparePodcastUploadResponse, error) {
	if _, err := apihelpers.RequireUser(ctx); err != nil {
		return nil, err
	}

	podcastID, err := apihelpers.ParseUUID(req.GetPodcastId(), "INVALID_PODCAST_ID", "podcast_id")
	if err != nil {
		return nil, err
	}

	item, uploadURL, objectKey, err := i.service.PreparePodcastUpload(ctx, podcastID, model.PreparePodcastUploadRequest{
		FileName:        req.GetFileName(),
		ContentType:     unmapContentType(req.GetContentType()),
		DurationSeconds: req.GetDurationSeconds(),
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
