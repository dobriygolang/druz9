package podcast

import (
	"api/internal/model"
	"context"

	"github.com/google/uuid"
)

// DeletePodcast deletes a podcast.
func (s *Service) DeletePodcast(ctx context.Context, podcastID uuid.UUID, actor *model.User) (string, error) {
	return s.repo.DeletePodcast(ctx, podcastID, actor)
}
