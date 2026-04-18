package podcast

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// AttachUpload attaches an uploaded file to a podcast.
func (s *Service) AttachUpload(ctx context.Context, podcastID uuid.UUID, req model.UploadPodcastRequest, uploadURL string) (*model.Podcast, error) {
	podcast, err := s.repo.AttachUpload(ctx, podcastID, req, uploadURL)
	if err != nil {
		return nil, fmt.Errorf("attach upload: %w", err)
	}
	return podcast, nil
}
