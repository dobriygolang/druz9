package server

import (
	"back/internal/config"
	"back/internal/service"
	podcastv1 "back/pkg/api/podcast/v1"
	profilev1 "back/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/go-kratos/kratos/v2/middleware/recovery"
	"github.com/go-kratos/kratos/v2/transport/grpc"
)

// NewGRPCServer new a gRPC server.
func NewGRPCServer(c *config.Server, podcast *service.PodcastService, profile *service.ProfileService, _ log.Logger) *grpc.Server {
	var opts = []grpc.ServerOption{
		grpc.Middleware(
			recovery.Recovery(),
		),
	}
	if c.GRPC.Addr != "" {
		opts = append(opts, grpc.Address(c.GRPC.Addr))
	}
	if c.GRPC.Timeout > 0 {
		opts = append(opts, grpc.Timeout(c.GRPC.Timeout))
	}
	srv := grpc.NewServer(opts...)
	podcastv1.RegisterPodcastServer(srv, podcast)
	profilev1.RegisterProfileServiceServer(srv, profile)
	return srv
}
