package admin

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/rtc"
	v1 "api/pkg/api/admin/v1"
)

func (i *Implementation) GetConfig(ctx context.Context, req *v1.GetConfigRequest) (*v1.GetConfigResponse, error) {
	if i.configService == nil {
		return nil, errors.InternalServer("CONFIG_SERVICE_UNAVAILABLE", "config service is not configured")
	}

	variable, ok := i.configService.ListVariables(ctx)[rtc.Key(req.GetKey())]
	if !ok {
		return nil, errors.NotFound("CONFIG_NOT_FOUND", "config key not found")
	}

	return &v1.GetConfigResponse{
		Key:      string(variable.Key),
		Value:    variable.Value().String(),
		Type:     variable.Type,
		Writable: variable.Writable,
		Usage:    variable.Usage,
		Group:    variable.Group,
	}, nil
}
