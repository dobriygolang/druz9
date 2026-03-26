package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// GetPodcast retrieves a specific podcast.
func (s *Service) GetPodcast(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error) {
	return s.repo.GetPodcast(ctx, podcastID)
}
