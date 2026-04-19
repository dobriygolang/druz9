package hub

import (
	"context"

	v1 "api/pkg/api/hub/v1"
)

// GetRegionContext stub. Please implement it.
func (i *Implementation) GetRegionContext(ctx context.Context, req *v1.GetRegionContextRequest) (*v1.RegionContext, error) {
	_ = ctx
	_ = req
	panic("TODO: implement GetRegionContext")
}
