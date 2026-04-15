package podcast

import (
	"context"

	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/podcast/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) DeletePodcast(ctx context.Context, req *v1.DeletePodcastRequest) (*v1.PodcastStatusResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}

	podcastID, err := uuid.Parse(req.PodcastId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_PODCAST_ID", "invalid podcast id")
	}
	if _, err := i.service.DeletePodcast(ctx, podcastID, user); err != nil {
		return nil, err
	}
	return &v1.PodcastStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
