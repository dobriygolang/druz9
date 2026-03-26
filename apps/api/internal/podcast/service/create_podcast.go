package service

import (
	"context"

	"api/internal/model"
)

// CreatePodcast creates a new podcast.
func (s *Service) CreatePodcast(ctx context.Context, user *model.User, req model.CreatePodcastRequest) (*model.Podcast, error) {
	return s.repo.CreatePodcast(ctx, user, req)
}
