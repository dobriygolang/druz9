package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// AttachUpload attaches an uploaded file to a podcast.
func (s *Service) AttachUpload(ctx context.Context, podcastID uuid.UUID, req model.UploadPodcastRequest, uploadURL string) (*model.Podcast, error) {
	return s.repo.AttachUpload(ctx, podcastID, req, uploadURL)
}
