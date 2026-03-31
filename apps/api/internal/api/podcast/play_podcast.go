package podcast

import (
	"context"

	"api/internal/metrics"
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

	metrics.IncListens()
	metrics.IncPodcastListen(item.ID.String(), item.Title)

	return &v1.PlayPodcastResponse{
		Podcast:   mapPodcast(item),
		StreamUrl: streamURL,
	}, nil
}
