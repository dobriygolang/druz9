package podcast

import (
	"context"

	v1 "api/pkg/api/podcast/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) DeletePodcast(ctx context.Context, req *v1.DeletePodcastRequest) (*v1.PodcastStatusResponse, error) {
	if _, err := requireAdmin(ctx); err != nil {
		return nil, err
	}

	podcastID, err := uuid.Parse(req.PodcastId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_PODCAST_ID", "invalid podcast id")
	}
	if _, err := i.service.DeletePodcast(ctx, podcastID); err != nil {
		return nil, err
	}
	return &v1.PodcastStatusResponse{Status: "ok"}, nil
}
