package notification

import (
	"notification-service/internal/service"
	v1 "notification-service/pkg/notification/v1"

	"google.golang.org/grpc"
)

// Implementation of notification service.
type Implementation struct {
	v1.UnimplementedNotificationServiceServer
	service *service.Service
}

// New returns new instance of Implementation.
func New(service *service.Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.NotificationService_ServiceDesc
}
