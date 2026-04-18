package podcast

import (
	"context"

	"api/internal/apihelpers"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/podcast/v1"
)

func (i *Implementation) DeletePodcast(ctx context.Context, req *v1.DeletePodcastRequest) (*v1.PodcastStatusResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	podcastID, err := apihelpers.ParseUUID(req.PodcastId, "INVALID_PODCAST_ID", "podcast_id")
	if err != nil {
		return nil, err
	}
	if _, err := i.service.DeletePodcast(ctx, podcastID, user); err != nil {
		return nil, err
	}
	return &v1.PodcastStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
