package podcast

import (
	"context"
	"fmt"

	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"
)

func (i *Implementation) ListPodcasts(ctx context.Context, req *v1.ListPodcastsRequest) (*v1.ListPodcastsResponse, error) {
	opts := model.ListPodcastsOptions{
		Limit:  req.GetLimit(),
		Offset: req.GetOffset(),
	}

	resp, err := i.service.ListPodcasts(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("list podcasts: %w", err)
	}

	podcasts := make([]*v1.Podcast, 0, len(resp.Podcasts))
	for _, item := range resp.Podcasts {
		podcasts = append(podcasts, mapPodcast(item))
	}

	return &v1.ListPodcastsResponse{
		Podcasts:    podcasts,
		Limit:       resp.Limit,
		Offset:      resp.Offset,
		TotalCount:  resp.TotalCount,
		HasNextPage: resp.HasNextPage,
	}, nil
}
