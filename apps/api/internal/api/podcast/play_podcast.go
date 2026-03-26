package podcast

import (
	"context"

	v1 "api/pkg/api/podcast/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) PlayPodcast(ctx context.Context, req *v1.PlayPodcastRequest) (*v1.PlayPodcastResponse, error) {
	podcastID, err := uuid.Parse(req.PodcastId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_PODCAST_ID", "invalid podcast id")
	}

	item, streamURL, err := i.service.PlayPodcast(ctx, podcastID)
	if err != nil {
		return nil, err
	}
	return &v1.PlayPodcastResponse{
		Podcast:   mapPodcast(item),
		StreamUrl: streamURL,
	}, nil
}
