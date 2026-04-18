package event

import (
	"google.golang.org/grpc"

	v1 "api/pkg/api/event/v1"
)

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
