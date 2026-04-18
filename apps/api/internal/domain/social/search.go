package social

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"api/internal/model"
)

// SearchUsers performs a typeahead search across all users by username /
// display name. Results include whether the viewer is already friends with
// each hit and whether a pending request was sent.
func (s *Service) SearchUsers(ctx context.Context, viewerID uuid.UUID, query string, limit int32) ([]*model.UserHit, error) {
	query = strings.TrimSpace(query)
	if len(query) < 2 {
		return []*model.UserHit{}, nil
	}
	if limit <= 0 || limit > 20 {
		limit = 20
	}
	return s.repo.SearchUsers(ctx, viewerID, query, limit)
}
