package podcast

import (
	"context"

	v1 "api/pkg/api/podcast/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) GetPodcast(ctx context.Context, req *v1.GetPodcastRequest) (*v1.PodcastResponse, error) {
	podcastID, err := uuid.Parse(req.PodcastId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_PODCAST_ID", "invalid podcast id")
	}

	item, err := i.service.GetPodcast(ctx, podcastID)
	if err != nil {
		return nil, err
	}
	return &v1.PodcastResponse{Podcast: mapPodcast(item)}, nil
}
