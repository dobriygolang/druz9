package service

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// Config represents event domain service configuration.
type Config struct {
	Repository Repository
}

// Service implements event domain logic.
type Service struct {
	repo Repository
}

// Repository is a data-layer interface for event queries.
type Repository interface {
	ListEvents(ctx context.Context, currentUserID uuid.UUID, opts model.ListEventsOptions) (*model.ListEventsResponse, error)
	CreateEvent(ctx context.Context, creatorID uuid.UUID, req model.CreateEventRequest) (*model.Event, error)
	JoinEvent(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) (*model.Event, error)
	LeaveEvent(ctx context.Context, eventID uuid.UUID, userID uuid.UUID) error
	UpdateEvent(ctx context.Context, eventID uuid.UUID, actor *model.User, req model.UpdateEventRequest) (*model.Event, error)
	DeleteEvent(ctx context.Context, eventID uuid.UUID, actor *model.User) error
}

// NewEventService creates new event domain service.
func NewEventService(c Config) *Service {
	return &Service{
		repo: c.Repository,
	}
}
