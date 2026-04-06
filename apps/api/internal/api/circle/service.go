package circle

import (
	v1 "api/pkg/api/circle/v1"

	"google.golang.org/grpc"
)

// Implementation of circle service.
type Implementation struct {
	v1.UnimplementedCircleServiceServer
	service  Service
	eventSvc EventService
}

// New returns new instance of Implementation.
func New(service Service, eventSvc EventService) *Implementation {
	return &Implementation{service: service, eventSvc: eventSvc}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.CircleService_ServiceDesc
}
