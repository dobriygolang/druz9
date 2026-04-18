package podcast

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// GetPodcast retrieves a specific podcast.
func (s *Service) GetPodcast(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error) {
	return s.repo.GetPodcast(ctx, podcastID)
}
