package server

import (
	"time"

	"api/internal/config"
	authmiddleware "api/internal/middleware"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/go-kratos/kratos/v2/middleware/logging"
	"github.com/go-kratos/kratos/v2/middleware/recovery"
	kratosgrpc "github.com/go-kratos/kratos/v2/transport/grpc"
)

func NewGRPCServer(
	addr string,
	timeout time.Duration,
	authorizer authmiddleware.ProfileAuthorizer,
	cookies *SessionCookieManager,
	shouldRequireAuth func() bool,
	kLogger klog.Logger,
	rateLimitCfg *config.RateLimit,
	cbCfg *config.CircuitBreaker,
) *kratosgrpc.Server {
	return kratosgrpc.NewServer(
		kratosgrpc.Address(addr),
		kratosgrpc.Timeout(timeout),
		kratosgrpc.Middleware(
			recovery.Recovery(),
			logging.Server(kLogger),
			MetricsMiddleware(),
			newServerRateLimiter(rateLimitCfg),
			newGRPCServerCircuitBreaker(cbCfg),
			newGRPCOptionalAuthMiddleware(authorizer, cookies),
			newGRPCAuthMiddleware(authorizer, cookies, shouldRequireAuth),
			newGRPCAdminMiddleware(),
		),
	)
}
