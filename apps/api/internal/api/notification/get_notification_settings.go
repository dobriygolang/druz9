package notification

import (
	"context"

	v1 "api/pkg/api/notification/v1"
)

// GetNotificationSettings stub. Please implement it.
func (i *Implementation) GetNotificationSettings(ctx context.Context, req *v1.GetNotificationSettingsRequest) (*v1.NotificationSettings, error) {
	_ = ctx
	_ = req
	panic("TODO: implement GetNotificationSettings")
}
