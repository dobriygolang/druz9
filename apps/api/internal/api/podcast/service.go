package podcast

import (
	v1 "api/pkg/api/podcast/v1"

	"google.golang.org/grpc"
)

// Implementation of podcast service.
type Implementation struct {
	v1.UnimplementedPodcastServiceServer
	service Service
}

// New returns new instance of Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.PodcastService_ServiceDesc
}
