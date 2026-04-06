package circle

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// Config represents circle domain service configuration.
type Config struct {
	Repository Repository
}

// Service implements circle domain logic.
type Service struct {
	repo Repository
}

// Repository is a data-layer interface for circle queries.
type Repository interface {
	ListCircles(ctx context.Context, currentUserID uuid.UUID, opts model.ListCirclesOptions) (*model.ListCirclesResponse, error)
	CreateCircle(ctx context.Context, creatorID uuid.UUID, name, description string, tags []string) (*model.Circle, error)
	JoinCircle(ctx context.Context, circleID, userID uuid.UUID) error
	LeaveCircle(ctx context.Context, circleID, userID uuid.UUID) error
	IsMember(ctx context.Context, circleID, userID uuid.UUID) (bool, error)
	ListCircleMembers(ctx context.Context, circleID uuid.UUID, limit int32) ([]*model.CircleMemberProfile, error)
}

// NewService creates new circle domain service.
func NewService(c Config) *Service {
	return &Service{
		repo: c.Repository,
	}
}

// IsMember checks if a user is a member of a circle.
func (s *Service) IsMember(ctx context.Context, circleID, userID uuid.UUID) (bool, error) {
	return s.repo.IsMember(ctx, circleID, userID)
}

// ListCircleMembers returns profiles of members in a circle.
func (s *Service) ListCircleMembers(ctx context.Context, circleID uuid.UUID, limit int32) ([]*model.CircleMemberProfile, error) {
	return s.repo.ListCircleMembers(ctx, circleID, limit)
}
