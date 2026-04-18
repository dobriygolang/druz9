package admin

import (
	"context"

	"api/internal/rtc"
	v1 "api/pkg/api/admin/v1"
)

func (i *Implementation) GetRuntimeConfig(ctx context.Context, _ *v1.GetRuntimeConfigRequest) (*v1.GetRuntimeConfigResponse, error) {
	return &v1.GetRuntimeConfigResponse{
		AppRequireAuth:   i.configService.GetValue(ctx, rtc.AppRequireAuth).Bool(),
		ArenaRequireAuth: i.configService.GetValue(ctx, rtc.ArenaRequireAuth).Bool(),
	}, nil
}
