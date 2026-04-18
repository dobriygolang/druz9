package event

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	ListEvents(ctx context.Context, userID uuid.UUID, opts model.ListEventsOptions) (*model.ListEventsResponse, error)
	CreateEvent(ctx context.Context, userID uuid.UUID, isAdmin bool, req model.CreateEventRequest) (*model.Event, error)
	JoinEvent(ctx context.Context, userID, eventID uuid.UUID) (*model.Event, error)
	LeaveEvent(ctx context.Context, userID, eventID uuid.UUID) error
	UpdateEvent(ctx context.Context, eventID uuid.UUID, user *model.User, req model.UpdateEventRequest) (*model.Event, error)
	DeleteEvent(ctx context.Context, eventID uuid.UUID, user *model.User) error
}