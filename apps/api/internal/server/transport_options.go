package server

import (
	"net/http"

	"api/internal/config"

	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/middleware/ratelimit"
	"github.com/gorilla/handlers"
)

func newServerRateLimiter(rateLimitCfg *config.RateLimit) middleware.Middleware {
	if rateLimitCfg != nil && rateLimitCfg.MaxCalls > 0 {
		return ratelimit.Server(ratelimit.WithLimiter(newFixedWindowLimiter(rateLimitCfg)))
	}
	return ratelimit.Server()
}

func httpCORSFilter() func(next http.Handler) http.Handler {
	return handlers.CORS(
		handlers.AllowedOriginValidator(func(origin string) bool {
			return origin != ""
		}),
		handlers.AllowedMethods([]string{"GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Accept", "Authorization", "X-Requested-With", "X-Code-Editor-Guest-Name", "X-Arena-Guest-Id", "X-Arena-Guest-Name"}),
		handlers.AllowCredentials(),
	)
}
