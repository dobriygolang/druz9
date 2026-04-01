package server

import (
	"time"

	profileservice "api/internal/api/profile"
	"api/internal/config"
	authmiddleware "api/internal/middleware"
	v1 "api/pkg/api/profile/v1"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/go-kratos/kratos/v2/middleware/logging"
	"github.com/go-kratos/kratos/v2/middleware/recovery"
	kratosgrpc "github.com/go-kratos/kratos/v2/transport/grpc"
)

func NewGRPCServer(
	addr string,
	timeout time.Duration,
	profileService *profileservice.Implementation,
	authorizer authmiddleware.ProfileAuthorizer,
	cookies *SessionCookieManager,
	kLogger klog.Logger,
	rateLimitCfg *config.RateLimit,
	cbCfg *config.CircuitBreaker,
) *kratosgrpc.Server {
	srv := kratosgrpc.NewServer(
		kratosgrpc.Address(addr),
		kratosgrpc.Timeout(timeout),
		kratosgrpc.Middleware(
			recovery.Recovery(),
			logging.Server(kLogger),
			MetricsMiddleware(),
			newServerRateLimiter(rateLimitCfg),
			newGRPCServerCircuitBreaker(cbCfg),
			newGRPCOptionalAuthMiddleware(authorizer, cookies),
			newGRPCAuthMiddleware(authorizer, cookies),
			newGRPCAdminMiddleware(),
		),
	)

	v1.RegisterProfileServiceServer(srv, profileService)
	return srv
}
