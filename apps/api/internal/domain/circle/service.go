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
	CreateCircle(ctx context.Context, creatorID uuid.UUID, name, description string, tags []string, isPublic bool) (*model.Circle, error)
	JoinCircle(ctx context.Context, circleID, userID uuid.UUID) error
	LeaveCircle(ctx context.Context, circleID, userID uuid.UUID) error
	IsMember(ctx context.Context, circleID, userID uuid.UUID) (bool, error)
	ListCircleMembers(ctx context.Context, circleID uuid.UUID, limit int32) ([]*model.CircleMemberProfile, error)
	InviteToCircle(ctx context.Context, circleID, inviterID, inviteeID uuid.UUID) error
	GetCircle(ctx context.Context, circleID uuid.UUID) (*model.Circle, error)
}

// NewService creates new circle domain service.
func NewService(c Config) *Service {
	return &Service{
		repo: c.Repository,
	}
}
