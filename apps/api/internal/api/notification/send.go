package notification

import (
	"context"

	v1 "api/pkg/api/notification/v1"
)

// Send stub. Please implement it.
func (i *Implementation) Send(ctx context.Context, req *v1.SendRequest) (*v1.SendResponse, error) {
	_ = ctx
	_ = req
	panic("TODO: implement Send")
}
