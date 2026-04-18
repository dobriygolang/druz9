package podcast

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// DeletePodcast deletes a podcast.
func (s *Service) DeletePodcast(ctx context.Context, podcastID uuid.UUID, actor *model.User) (string, error) {
	return s.repo.DeletePodcast(ctx, podcastID, actor)
}
