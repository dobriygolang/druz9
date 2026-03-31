package admin

import (
	"context"

	v1 "api/pkg/api/admin/v1"
)

// ListConfig stub. Please implement it.
func (i *Implementation) ListConfig(ctx context.Context, req *v1.ListConfigRequest) (*v1.ListConfigResponse, error) {
	_ = ctx
	_ = req
	panic("TODO: implement ListConfig")
}
