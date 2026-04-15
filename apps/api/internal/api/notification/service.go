package notification

import (
	v1 "api/pkg/api/notification/v1"
	"google.golang.org/grpc"
)

type Service interface{}

// Implementation of notification service.
type Implementation struct {
	v1.UnimplementedNotificationServiceServer
	service Service
}

// New returns new instance of Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.NotificationService_ServiceDesc
}
