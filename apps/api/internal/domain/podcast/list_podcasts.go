package podcast

import (
	"context"
	"fmt"

	"api/internal/model"
)

// ListPodcasts retrieves podcasts with pagination.
func (s *Service) ListPodcasts(ctx context.Context, opts model.ListPodcastsOptions) (*model.ListPodcastsResponse, error) {
	resp, err := s.repo.ListPodcasts(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("list podcasts: %w", err)
	}
	return resp, nil
}
