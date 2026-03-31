package admin

import (
	"context"

	v1 "api/pkg/api/admin/v1"
)

// GetConfig stub. Please implement it.
func (i *Implementation) GetConfig(ctx context.Context, req *v1.GetConfigRequest) (*v1.GetConfigResponse, error) {
	_ = ctx
	_ = req
	panic("TODO: implement GetConfig")
}
