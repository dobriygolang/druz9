package notification

import (
	notifclient "api/internal/clients/notification"
	v1 "api/pkg/api/notification/v1"

	"google.golang.org/grpc"
)

// SettingsImplementation exposes notification preferences to the frontend over HTTP/gRPC.
// It proxies calls to the internal notification-service via Sender.
type SettingsImplementation struct {
	v1.UnimplementedNotificationSettingsServiceServer
	sender notifclient.Sender
}

// NewSettings constructs SettingsImplementation.
func NewSettings(sender notifclient.Sender) *SettingsImplementation {
	return &SettingsImplementation{sender: sender}
}

// GetDescription returns grpc service description for NotificationSettingsService.
func (i *SettingsImplementation) GetDescription() grpc.ServiceDesc {
	return v1.NotificationSettingsService_ServiceDesc
}
