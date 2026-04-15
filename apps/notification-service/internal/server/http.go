package server

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/go-kratos/kratos/v2/middleware/logging"
	"github.com/go-kratos/kratos/v2/middleware/recovery"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

func NewHTTPServer(addr string, timeout time.Duration, logger klog.Logger, readiness func(context.Context) error) *kratoshttp.Server {
	srv := kratoshttp.NewServer(
		kratoshttp.Address(addr),
		kratoshttp.Timeout(timeout),
		kratoshttp.Middleware(
			recovery.Recovery(),
			logging.Server(logger),
		),
	)

	r := srv.Route("/")
	r.GET("/healthz", func(ctx kratoshttp.Context) error {
		writeJSON(ctx.Response(), http.StatusOK, map[string]string{"status": "ok"})
		return nil
	})
	r.GET("/readyz", func(ctx kratoshttp.Context) error {
		if readiness != nil {
			if err := readiness(ctx.Request().Context()); err != nil {
				writeJSON(ctx.Response(), http.StatusServiceUnavailable, map[string]string{
					"status": "not_ready",
					"error":  err.Error(),
				})
				return nil
			}
		}
		writeJSON(ctx.Response(), http.StatusOK, map[string]string{"status": "ready"})
		return nil
	})

	return srv
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
