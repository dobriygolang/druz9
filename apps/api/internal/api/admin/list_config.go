package admin

import (
	"context"
	"sort"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/rtc"
	v1 "api/pkg/api/admin/v1"
)

func (i *Implementation) ListConfig(ctx context.Context, req *v1.ListConfigRequest) (*v1.ListConfigResponse, error) {
	_ = req
	if i.configService == nil {
		return nil, errors.InternalServer("CONFIG_SERVICE_UNAVAILABLE", "config service is not configured")
	}

	variables := i.configService.ListVariables(ctx)
	keys := make([]string, 0, len(variables))
	for key := range variables {
		keys = append(keys, string(key))
	}
	sort.Strings(keys)

	items := make([]*v1.ConfigItem, 0, len(keys))
	for _, key := range keys {
		variable := variables[rtc.Key(key)]
		items = append(items, &v1.ConfigItem{
			Key:      string(variable.Key),
			Value:    variable.Value().String(),
			Type:     variable.Type,
			Writable: variable.Writable,
			Usage:    variable.Usage,
			Group:    variable.Group,
		})
	}

	return &v1.ListConfigResponse{Configs: items}, nil
}
