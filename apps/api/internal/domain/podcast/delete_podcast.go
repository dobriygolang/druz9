package podcast

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"api/internal/model"
)

// DeletePodcast deletes a podcast.
func (s *Service) DeletePodcast(ctx context.Context, podcastID uuid.UUID, actor *model.User) (string, error) {
	objectKey, err := s.repo.DeletePodcast(ctx, podcastID, actor)
	if err != nil {
		return "", fmt.Errorf("delete podcast: %w", err)
	}
	return objectKey, nil
}
