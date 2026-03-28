package server

import (
	"net/http"
	"time"

	"api/internal/config"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func NewOpsServer(cfg *config.Metrics) *http.Server {
	if cfg == nil || cfg.Addr == "" {
		return nil
	}

	mux := http.NewServeMux()
	registerOpsHandlers(mux)

	return &http.Server{
		Addr:              cfg.Addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
}

func StartOpsServer(logger klog.Logger, srv *http.Server) {
	if srv == nil {
		return
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			klog.Errorf("ops server error: %v", err)
		}
	}()
}

func registerOpsHandlers(mux *http.ServeMux) {
	mux.Handle("/metrics", promhttp.Handler())

	// pprof handlers are exposed only on the dedicated ops server.
	mux.HandleFunc("/debug/pprof/", http.DefaultServeMux.ServeHTTP)
	mux.HandleFunc("/debug/pprof/heap", http.DefaultServeMux.ServeHTTP)
	mux.HandleFunc("/debug/pprof/goroutine", http.DefaultServeMux.ServeHTTP)
	mux.HandleFunc("/debug/pprof/block", http.DefaultServeMux.ServeHTTP)
	mux.HandleFunc("/debug/pprof/mutex", http.DefaultServeMux.ServeHTTP)
	mux.HandleFunc("/debug/pprof/threadcreate", http.DefaultServeMux.ServeHTTP)
	mux.HandleFunc("/debug/pprof/trace", http.DefaultServeMux.ServeHTTP)
	mux.HandleFunc("/debug/pprof/cmdline", http.DefaultServeMux.ServeHTTP)
	mux.HandleFunc("/debug/pprof/profile", http.DefaultServeMux.ServeHTTP)
	mux.HandleFunc("/debug/pprof/symbol", http.DefaultServeMux.ServeHTTP)
}
