package notification

import (
	"context"

	v1 "api/pkg/api/notification/v1"
)

// SendBatch stub. Please implement it.
func (i *Implementation) SendBatch(ctx context.Context, req *v1.SendBatchRequest) (*v1.SendBatchResponse, error) {
	_ = ctx
	_ = req
	panic("TODO: implement SendBatch")
}
