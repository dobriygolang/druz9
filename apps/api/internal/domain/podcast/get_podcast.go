package podcast

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// GetPodcast retrieves a specific podcast.
func (s *Service) GetPodcast(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error) {
	podcast, err := s.repo.GetPodcast(ctx, podcastID)
	if err != nil {
		return nil, fmt.Errorf("get podcast: %w", err)
	}
	return podcast, nil
}
