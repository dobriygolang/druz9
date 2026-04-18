// Package social implements the gRPC/HTTP transport for the Social service.
package social

import (
	"google.golang.org/grpc"

	v1 "api/pkg/api/social/v1"
)

// Implementation is the gRPC/HTTP handler for the Social service.
type Implementation struct {
	v1.UnimplementedSocialServiceServer
	service Service
}

func New(s Service) *Implementation                        { return &Implementation{service: s} }
func (i *Implementation) GetDescription() grpc.ServiceDesc { return v1.SocialService_ServiceDesc }
