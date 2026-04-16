package server

import (
	"context"

	"api/internal/config"

	"github.com/go-kratos/aegis/circuitbreaker"
	"github.com/go-kratos/aegis/circuitbreaker/sre"
	kratoserrpkg "github.com/go-kratos/kratos/v2/errors"
	"github.com/go-kratos/kratos/v2/middleware"
)

func newHTTPServerCircuitBreaker(cbCfg *config.CircuitBreaker) middleware.Middleware {
	return newServerCircuitBreaker(cbCfg)
}

func newGRPCServerCircuitBreaker(cbCfg *config.CircuitBreaker) middleware.Middleware {
	return newServerCircuitBreaker(cbCfg)
}

func newServerCircuitBreaker(cbCfg *config.CircuitBreaker) middleware.Middleware {
	return circuitBreakerMiddleware(newAdaptiveBreaker(cbCfg))
}

func newAdaptiveBreaker(cbCfg *config.CircuitBreaker) circuitbreaker.CircuitBreaker {
	cbRequest := int64(100)
	cbSuccess := 0.6
	if cbCfg != nil {
		if cbCfg.Request > 0 {
			cbRequest = cbCfg.Request
		}
		if cbCfg.Success > 0 {
			cbSuccess = cbCfg.Success
		}
	}
	return sre.NewBreaker(
		sre.WithRequest(cbRequest),
		sre.WithSuccess(cbSuccess),
	)
}

func circuitBreakerMiddleware(breaker circuitbreaker.CircuitBreaker) middleware.Middleware {
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req any) (any, error) {
			if err := breaker.Allow(); err != nil {
				breaker.MarkFailed()
				return nil, kratoserrpkg.New(503, "CIRCUITBREAKER", "service is temporarily unavailable, circuit open")
			}
			reply, err := handler(ctx, req)
			if err != nil && (kratoserrpkg.IsInternalServer(err) || kratoserrpkg.IsServiceUnavailable(err) || kratoserrpkg.IsGatewayTimeout(err)) {
				breaker.MarkFailed()
			} else {
				breaker.MarkSuccess()
			}
			return reply, err
		}
	}
}
