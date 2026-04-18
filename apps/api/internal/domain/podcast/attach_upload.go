package podcast

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// AttachUpload attaches an uploaded file to a podcast.
func (s *Service) AttachUpload(ctx context.Context, podcastID uuid.UUID, req model.UploadPodcastRequest, uploadURL string) (*model.Podcast, error) {
	return s.repo.AttachUpload(ctx, podcastID, req, uploadURL)
}
