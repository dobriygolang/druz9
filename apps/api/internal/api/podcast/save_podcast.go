package podcast

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/apihelpers"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/podcast/v1"
)

func (i *Implementation) SavePodcast(ctx context.Context, req *v1.SavePodcastRequest) (*v1.PodcastStatusResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	if i.saved == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "saved podcasts not wired")
	}
	id, err := uuid.Parse(req.GetPodcastId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_PODCAST_ID", "invalid podcast_id")
	}
	if err := i.saved.SavePodcast(ctx, user.ID, id); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to save podcast")
	}
	return &v1.PodcastStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
