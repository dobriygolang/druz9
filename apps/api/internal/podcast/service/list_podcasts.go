package service

import (
	"context"

	"api/internal/model"
)

// ListPodcasts retrieves podcasts with pagination.
func (s *Service) ListPodcasts(ctx context.Context, opts model.ListPodcastsOptions) (*model.ListPodcastsResponse, error) {
	return s.repo.ListPodcasts(ctx, opts)
}