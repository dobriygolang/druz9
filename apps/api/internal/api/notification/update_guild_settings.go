package notification

import (
	"context"

	v1 "api/pkg/api/notification/v1"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (i *Implementation) UpdateGuildSettings(ctx context.Context, req *v1.UpdateGuildSettingsRequest) (*v1.UpdateGuildSettingsResponse, error) {
	_ = ctx
	_ = req
	return nil, status.Error(codes.Unimplemented, "notification rpc is handled by notification-service")
}
