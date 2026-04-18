package podcast

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// IncrementListens increments the listen count for a podcast.
func (s *Service) IncrementListens(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error) {
	podcast, err := s.repo.IncrementListens(ctx, podcastID)
	if err != nil {
		return nil, fmt.Errorf("increment listens: %w", err)
	}
	return podcast, nil
}
