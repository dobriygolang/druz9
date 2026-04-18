package podcast

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	v1 "api/pkg/api/podcast/v1"
)

func (i *Implementation) GetPodcast(ctx context.Context, req *v1.GetPodcastRequest) (*v1.PodcastResponse, error) {
	podcastID, err := apihelpers.ParseUUID(req.GetPodcastId(), "INVALID_PODCAST_ID", "podcast_id")
	if err != nil {
		return nil, fmt.Errorf("context: %w", err)
	}

	item, err := i.service.GetPodcast(ctx, podcastID)
	if err != nil {
		return nil, fmt.Errorf("get podcast: %w", err)
	}
	return &v1.PodcastResponse{Podcast: mapPodcast(item)}, nil
}
