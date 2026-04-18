package guild

import (
	notif "api/internal/clients/notification"
	v1 "api/pkg/api/guild/v1"

	"google.golang.org/grpc"
)

// Implementation of guild service.
type Implementation struct {
	v1.UnimplementedGuildServiceServer
	service  Service
	eventSvc EventService
	notif    notif.Sender
}

// New returns new instance of Implementation.
func New(service Service, eventSvc EventService, n notif.Sender) *Implementation {
	return &Implementation{service: service, eventSvc: eventSvc, notif: n}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.GuildService_ServiceDesc
}
