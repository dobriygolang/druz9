package event

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	ListEvents(context.Context, uuid.UUID, model.ListEventsOptions) (*model.ListEventsResponse, error)
	CreateEvent(context.Context, uuid.UUID, bool, model.CreateEventRequest) (*model.Event, error)
	JoinEvent(context.Context, uuid.UUID, uuid.UUID) (*model.Event, error)
	LeaveEvent(context.Context, uuid.UUID, uuid.UUID) error
	UpdateEvent(context.Context, uuid.UUID, *model.User, model.UpdateEventRequest) (*model.Event, error)
	DeleteEvent(context.Context, uuid.UUID, *model.User) error
}
