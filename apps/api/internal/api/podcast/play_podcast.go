package podcast

import (
	"context"

	"api/internal/apihelpers"
	"api/internal/metrics"
	v1 "api/pkg/api/podcast/v1"
)

func (i *Implementation) PlayPodcast(ctx context.Context, req *v1.PlayPodcastRequest) (*v1.PlayPodcastResponse, error) {
	podcastID, err := apihelpers.ParseUUID(req.GetPodcastId(), "INVALID_PODCAST_ID", "podcast_id")
	if err != nil {
		return nil, err
	}

	item, streamURL, err := i.service.PlayPodcast(ctx, podcastID)
	if err != nil {
		return nil, err
	}

	metrics.IncListens()
	metrics.IncPodcastListen(item.ID.String())

	return &v1.PlayPodcastResponse{
		Podcast:   mapPodcast(item),
		StreamUrl: streamURL,
	}, nil
}
