package podcast

import (
	"context"
	"fmt"

	"api/internal/model"
)

// CreatePodcast creates a new podcast.
func (s *Service) CreatePodcast(ctx context.Context, user *model.User, req model.CreatePodcastRequest) (*model.Podcast, error) {
	podcast, err := s.repo.CreatePodcast(ctx, user, req)
	if err != nil {
		return nil, fmt.Errorf("create podcast: %w", err)
	}
	return podcast, nil
}
