package podcast

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/podcast/v1"
)

const maxInlinePodcastUploadSize = 20 * 1024 * 1024

func (i *Implementation) UploadPodcast(ctx context.Context, req *v1.UploadPodcastRequest) (*v1.PodcastResponse, error) {
	if _, err := requireAdmin(ctx); err != nil {
		return nil, err
	}

	podcastID, err := apihelpers.ParseUUID(req.GetPodcastId(), "INVALID_PODCAST_ID", "podcast_id")
	if err != nil {
		return nil, err
	}
	if len(req.GetContent()) > maxInlinePodcastUploadSize {
		return nil, errors.BadRequest(
			"INLINE_UPLOAD_TOO_LARGE",
			"podcast file is too large for inline upload, use prepare/complete upload flow",
		)
	}

	item, err := i.service.UploadPodcast(ctx, podcastID, model.UploadPodcastRequest{
		FileName:        req.GetFileName(),
		ContentType:     unmapContentType(req.GetContentType()),
		Content:         req.GetContent(),
		DurationSeconds: req.GetDurationSeconds(),
	})
	if err != nil {
		if kratosErr := errors.FromError(err); kratosErr.Reason != "UNKNOWN" {
			return nil, err
		}
		return nil, errors.InternalServer("PODCAST_UPLOAD_FAILED", "failed to upload podcast")
	}
	return &v1.PodcastResponse{Podcast: mapPodcast(item)}, nil
}
