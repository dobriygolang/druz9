package notification

import (
	"context"

	v1 "api/pkg/api/notification/v1"
)

// GetSettings stub. Please implement it.
func (i *Implementation) GetSettings(ctx context.Context, req *v1.GetSettingsRequest) (*v1.GetSettingsResponse, error) {
	_ = ctx
	_ = req
	panic("TODO: implement GetSettings")
}
