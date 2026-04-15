package profile

import (
	notif "api/internal/clients/notification"
	v1 "api/pkg/api/profile/v1"

	"google.golang.org/grpc"
)

// Implementation of profile service.
type Implementation struct {
	v1.UnimplementedProfileServiceServer
	service      Service
	cookie       SessionCookieManager
	progressRepo ProgressRepository
	notif        notif.Sender
}

// New returns new instance of Implementation.
func New(service Service, cookie SessionCookieManager, progressRepo ProgressRepository, notificationSender notif.Sender) *Implementation {
	return &Implementation{service: service, cookie: cookie, progressRepo: progressRepo, notif: notificationSender}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.ProfileService_ServiceDesc
}
