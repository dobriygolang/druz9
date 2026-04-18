package server

import (
	"context"
	"net/http"

	kratoserrpkg "github.com/go-kratos/kratos/v2/errors"
	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/transport"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/gorilla/handlers"

	"api/internal/config"
)

func newServerRateLimiter(rateLimitCfg *config.RateLimit) middleware.Middleware {
	limiter := newPerIPLimiter(rateLimitCfg)
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req any) (any, error) {
			ip := clientIP(ctx)
			if _, err := limiter.Allow(ip); err != nil {
				return nil, kratoserrpkg.New(429, "RATE_LIMITED", "too many requests")
			}
			return handler(ctx, req)
		}
	}
}

func clientIP(ctx context.Context) string {
	tr, ok := transport.FromServerContext(ctx)
	if !ok {
		return "unknown"
	}

	// Check X-Forwarded-For / X-Real-Ip headers first (reverse proxy).
	if xff := tr.RequestHeader().Get("X-Forwarded-For"); xff != "" {
		return extractIP(xff)
	}
	if xri := tr.RequestHeader().Get("X-Real-Ip"); xri != "" {
		return xri
	}

	// Fall back to connection remote address.
	if ht, ok := tr.(*kratoshttp.Transport); ok && ht.Request() != nil {
		return extractIP(ht.Request().RemoteAddr)
	}

	return "unknown"
}

func httpCORSFilter(allowedOrigins []string) func(next http.Handler) http.Handler {
	validator := func(origin string) bool {
		if origin == "" {
			return false
		}
		for _, allowed := range allowedOrigins {
			if allowed == "*" || allowed == origin {
				return true
			}
		}
		return false
	}

	return handlers.CORS(
		handlers.AllowedOriginValidator(validator),
		handlers.AllowedMethods([]string{"GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Accept", "Authorization", "X-Requested-With", "X-Code-Editor-Guest-Name", "X-Arena-Guest-Id", "X-Arena-Guest-Name"}),
		handlers.AllowCredentials(),
	)
}
