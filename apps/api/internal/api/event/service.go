package event

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/event/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	ListEvents(context.Context, uuid.UUID, model.ListEventsOptions) (*model.ListEventsResponse, error)
	CreateEvent(context.Context, uuid.UUID, model.CreateEventRequest) (*model.Event, error)
	JoinEvent(context.Context, uuid.UUID, uuid.UUID) (*model.Event, error)
	LeaveEvent(context.Context, uuid.UUID, uuid.UUID) error
	UpdateEvent(context.Context, uuid.UUID, *model.User, model.UpdateEventRequest) (*model.Event, error)
	DeleteEvent(context.Context, uuid.UUID, *model.User) error
	EnrichEventsWithAvatarURLs(context.Context, *model.ListEventsResponse) error
}

// Implementation of event service.
type Implementation struct {
	v1.UnimplementedEventServiceServer
	service Service
}

// New returns new instance of Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.EventService_ServiceDesc
}
