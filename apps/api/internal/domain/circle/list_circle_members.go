package circle

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// ListCircleMembers returns member profiles for a circle.
func (s *Service) ListCircleMembers(ctx context.Context, circleID uuid.UUID, limit int32) ([]*model.CircleMemberProfile, error) {
	return s.repo.ListCircleMembers(ctx, circleID, limit)
}
