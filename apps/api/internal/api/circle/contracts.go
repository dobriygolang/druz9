package circle

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	ListCircles(context.Context, uuid.UUID, model.ListCirclesOptions) (*model.ListCirclesResponse, error)
	CreateCircle(context.Context, uuid.UUID, string, string, []string, bool) (*model.Circle, error)
	JoinCircle(context.Context, uuid.UUID, uuid.UUID) error
	LeaveCircle(context.Context, uuid.UUID, uuid.UUID) error
	InviteToCircle(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) error
	IsMember(context.Context, uuid.UUID, uuid.UUID) (bool, error)
	ListCircleMembers(context.Context, uuid.UUID, int32) ([]*model.CircleMemberProfile, error)
	DeleteCircle(context.Context, uuid.UUID, uuid.UUID) error
}

// EventService handles event operations for circles.
type EventService interface {
	ListEvents(ctx context.Context, currentUserID uuid.UUID, opts model.ListEventsOptions) (*model.ListEventsResponse, error)
	CreateEvent(ctx context.Context, creatorID uuid.UUID, req model.CreateEventRequest) (*model.Event, error)
}
