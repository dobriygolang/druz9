package service

import (
	"context"

	"github.com/google/uuid"
)

// DeletePodcast deletes a podcast.
func (s *Service) DeletePodcast(ctx context.Context, podcastID uuid.UUID) (string, error) {
	return s.repo.DeletePodcast(ctx, podcastID)
}