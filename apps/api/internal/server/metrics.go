package server

import (
	"context"
	"strconv"
	"strings"
	"time"

	kratoserrpkg "github.com/go-kratos/kratos/v2/errors"
	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/transport"
	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/grpc/status"
)

const unknownLabel = "unknown"

var (
	httpRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_server_requests_seconds_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "path", "code"},
	)

	httpRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_server_requests_seconds",
			Help:    "HTTP request latency in seconds",
			Buckets: []float64{0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
		[]string{"method", "path", "code"},
	)

	grpcRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "grpc_server_handled_total",
			Help: "Total number of gRPC requests",
		},
		[]string{"grpc_service", "grpc_method", "grpc_code"},
	)

	grpcRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "grpc_server_handling_seconds",
			Help:    "gRPC request handling time in seconds",
			Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5},
		},
		[]string{"grpc_service", "grpc_method"},
	)
)

func init() {
	prometheus.MustRegister(httpRequestsTotal, httpRequestDuration, grpcRequestsTotal, grpcRequestDuration)
}

// MetricsMiddleware returns a middleware that collects HTTP metrics.
func MetricsMiddleware() middleware.Middleware {
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req any) (any, error) {
			var (
				kind      string
				operation string
				path      string
				method    string
			)
			if tr, ok := transport.FromServerContext(ctx); ok {
				kind = tr.Kind().String()
				operation = tr.Operation()
				if header := tr.RequestHeader(); header != nil {
					path = header.Get(":path")
					method = header.Get(":method")
				}
			}

			startTime := time.Now()
			reply, err := handler(ctx, req)
			duration := time.Since(startTime)

			code := "200"
			if err != nil {
				var kratosErr *kratoserrpkg.Error
				if kratoserrpkg.As(err, &kratosErr) {
					code = strconv.Itoa(kratoserrpkg.Code(err))
				} else {
					code = "500"
				}
			}

			switch kind {
			case "http":
				if path == "" {
					path = operation
				}
				if path == "" {
					path = unknownLabel
				}
				if method == "" {
					method = "UNKNOWN"
				}
				httpRequestsTotal.WithLabelValues(method, path, code).Inc()
				httpRequestDuration.WithLabelValues(method, path, code).Observe(duration.Seconds())
			case "grpc":
				grpcCode := "OK"
				if err != nil {
					if st, ok := status.FromError(err); ok {
						grpcCode = st.Code().String()
					}
				}
				grpcService, grpcMethod := splitGRPCOperation(operation)
				grpcRequestsTotal.WithLabelValues(grpcService, grpcMethod, grpcCode).Inc()
				grpcRequestDuration.WithLabelValues(grpcService, grpcMethod).Observe(duration.Seconds())
			}

			return reply, err
		}
	}
}

func splitGRPCOperation(operation string) (string, string) {
	trimmed := strings.TrimSpace(operation)
	if trimmed == "" {
		return unknownLabel, unknownLabel
	}
	trimmed = strings.TrimPrefix(trimmed, "/")
	parts := strings.Split(trimmed, "/")
	if len(parts) != 2 {
		return unknownLabel, trimmed
	}
	return parts[0], parts[1]
}
