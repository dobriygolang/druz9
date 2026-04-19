package scene

import (
	v1 "api/pkg/api/scene/v1"
	"google.golang.org/grpc"
)

type Service interface{}

// Implementation of scene service.
type Implementation struct {
	v1.UnimplementedSceneServiceServer
	service Service
}

// New returns new instance of Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.SceneService_ServiceDesc
}
