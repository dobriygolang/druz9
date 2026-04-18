package podcast

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// IncrementListens increments the listen count for a podcast.
func (s *Service) IncrementListens(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error) {
	return s.repo.IncrementListens(ctx, podcastID)
}
