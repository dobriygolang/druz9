package server

import (
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/go-kratos/kratos/v2/middleware/logging"
	"github.com/go-kratos/kratos/v2/middleware/recovery"
	"github.com/go-kratos/kratos/v2/transport/http"
)

func NewHTTPServer(addr string, timeout time.Duration, logger klog.Logger) *http.Server {
	return http.NewServer(
		http.Address(addr),
		http.Timeout(timeout),
		http.Middleware(
			recovery.Recovery(),
			logging.Server(logger),
		),
	)
}
