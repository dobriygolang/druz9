package podcast

import (
	"google.golang.org/grpc"

	v1 "api/pkg/api/podcast/v1"
)

// Implementation of podcast service.
type Implementation struct {
	v1.UnimplementedPodcastServiceServer
	service Service
	series  SeriesRepo
}

// New returns new instance of Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.PodcastService_ServiceDesc
}
