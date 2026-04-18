package podcast

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	"api/internal/metrics"
	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"
)

func (i *Implementation) CreatePodcast(ctx context.Context, req *v1.CreatePodcastRequest) (*v1.PodcastResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("context: %w", err)
	}

	item, err := i.service.CreatePodcast(ctx, user, model.CreatePodcastRequest{Title: req.GetTitle()})
	if err != nil {
		return nil, fmt.Errorf("create podcast: %w", err)
	}

	metrics.IncPodcastCreated()

	return &v1.PodcastResponse{Podcast: mapPodcast(item)}, nil
}
