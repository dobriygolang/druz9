// Package streak implements the gRPC/HTTP transport for the Streak service.
package streak

import (
	"google.golang.org/grpc"

	v1 "api/pkg/api/streak/v1"
)

// Implementation is the gRPC/HTTP handler for the Streak service.
type Implementation struct {
	v1.UnimplementedStreakServiceServer
	service Service
}

func New(s Service) *Implementation { return &Implementation{service: s} }

func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.StreakService_ServiceDesc
}
