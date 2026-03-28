package podcast

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// IncrementListens increments the listen count for a podcast.
func (s *Service) IncrementListens(ctx context.Context, podcastID uuid.UUID) (*model.Podcast, error) {
	return s.repo.IncrementListens(ctx, podcastID)
}
