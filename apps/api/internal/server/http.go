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
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

func NewHTTPServer(
	addr string,
	timeout time.Duration,
	profileService *profileservice.Implementation,
	authorizer authmiddleware.ProfileAuthorizer,
	cookies *SessionCookieManager,
	shouldRequireAuth func() bool,
	kLogger klog.Logger,
	rateLimitCfg *config.RateLimit,
	cbCfg *config.CircuitBreaker,
) *kratoshttp.Server {
	opts := []kratoshttp.ServerOption{
		kratoshttp.Address(addr),
		kratoshttp.Timeout(timeout),
		kratoshttp.Filter(httpCORSFilter()),
		kratoshttp.Middleware(
			recovery.Recovery(),
			logging.Server(kLogger),
			MetricsMiddleware(),
			newServerRateLimiter(rateLimitCfg),
			newHTTPServerCircuitBreaker(cbCfg),
			newHTTPOptionalAuthMiddleware(authorizer, cookies),
			newHTTPAuthMiddleware(authorizer, cookies, shouldRequireAuth),
			newHTTPAdminMiddleware(),
		),
	}

	srv := kratoshttp.NewServer(opts...)

	v1.RegisterProfileServiceHTTPServer(srv, profileService)
	return srv
}
