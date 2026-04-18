package server

import (
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/go-kratos/kratos/v2/middleware/logging"
	"github.com/go-kratos/kratos/v2/middleware/recovery"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"

	"api/internal/config"
	authmiddleware "api/internal/middleware"
)

func NewHTTPServer(
	addr string,
	timeout time.Duration,
	authorizer authmiddleware.ProfileAuthorizer,
	cookies *SessionCookieManager,
	shouldRequireAuth func() bool,
	kLogger klog.Logger,
	rateLimitCfg *config.RateLimit,
	cbCfg *config.CircuitBreaker,
	allowedOrigins []string,
) *kratoshttp.Server {
	opts := []kratoshttp.ServerOption{
		kratoshttp.Address(addr),
		kratoshttp.Timeout(timeout),
		kratoshttp.Filter(httpCORSFilter(allowedOrigins)),
		kratoshttp.Middleware(
			recovery.Recovery(),
			logging.Server(kLogger),
			MetricsMiddleware(),
			newServerRateLimiter(rateLimitCfg),
			newHTTPServerCircuitBreaker(cbCfg),
			newHTTPOptionalAuthMiddleware(authorizer, cookies),
			newHTTPAuthMiddleware(authorizer, cookies, shouldRequireAuth),
			newHTTPAdminMiddleware(),
			// Per-user+per-operation caps on mutate endpoints. Sits AFTER
			// auth so userID bucketing has the enriched ctx.
			NewHTTPMutateRateLimiter(),
		),
	}

	return kratoshttp.NewServer(opts...)
}
