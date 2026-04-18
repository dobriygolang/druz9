package admin

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/rtc"
	v1 "api/pkg/api/admin/v1"
)

func (i *Implementation) UpdateConfig(ctx context.Context, req *v1.UpdateConfigRequest) (*v1.UpdateConfigResponse, error) {
	if i.configService == nil {
		return nil, errors.InternalServer("CONFIG_SERVICE_UNAVAILABLE", "config service is not configured")
	}

	if err := i.configService.SetValue(ctx, rtc.Key(req.GetKey()), req.GetValue()); err != nil {
		return nil, errors.BadRequest("INVALID_CONFIG_VALUE", err.Error())
	}

	return &v1.UpdateConfigResponse{
		Key:     req.GetKey(),
		Value:   req.GetValue(),
		Success: true,
	}, nil
}
