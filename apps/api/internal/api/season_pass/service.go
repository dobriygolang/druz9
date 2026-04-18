// Package season_pass implements the gRPC/HTTP transport for the SeasonPass service.
package season_pass

import (
	"google.golang.org/grpc"

	v1 "api/pkg/api/season_pass/v1"
)

// Implementation is the gRPC/HTTP handler for the SeasonPass service.
type Implementation struct {
	v1.UnimplementedSeasonPassServiceServer
	service Service
}

func New(s Service) *Implementation { return &Implementation{service: s} }

func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.SeasonPassService_ServiceDesc
}
