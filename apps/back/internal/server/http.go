package server

import (
	"back/internal/config"
	"back/internal/service"
	podcastv1 "back/pkg/api/podcast/v1"
	profilev1 "back/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/go-kratos/kratos/v2/middleware/recovery"
	"github.com/go-kratos/kratos/v2/transport/http"
)

// NewHTTPServer new an HTTP server.
func NewHTTPServer(c *config.Server, podcast *service.PodcastService, profile *service.ProfileService, _ log.Logger) *http.Server {
	var opts = []http.ServerOption{
		http.Middleware(
			recovery.Recovery(),
		),
	}
	if c.HTTP.Addr != "" {
		opts = append(opts, http.Address(c.HTTP.Addr))
	}
	if c.HTTP.Timeout > 0 {
		opts = append(opts, http.Timeout(c.HTTP.Timeout))
	}
	srv := http.NewServer(opts...)
	podcastv1.RegisterPodcastHTTPServer(srv, podcast)
	profilev1.RegisterProfileServiceHTTPServer(srv, profile)
	return srv
}
