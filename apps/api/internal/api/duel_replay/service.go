// Package duel_replay implements the gRPC/HTTP transport for the DuelReplay service.
package duel_replay

import (
	"google.golang.org/grpc"

	v1 "api/pkg/api/duel_replay/v1"
)

// Implementation is the gRPC/HTTP handler for the DuelReplay service.
type Implementation struct {
	v1.UnimplementedDuelReplayServiceServer
	service Service
}

func New(service Service) *Implementation { return &Implementation{service: service} }

func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.DuelReplayService_ServiceDesc
}
