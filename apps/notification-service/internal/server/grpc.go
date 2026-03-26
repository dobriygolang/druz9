package server

import (
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/go-kratos/kratos/v2/middleware/logging"
	"github.com/go-kratos/kratos/v2/middleware/recovery"
	"github.com/go-kratos/kratos/v2/transport/grpc"
)

func NewGRPCServer(addr string, timeout time.Duration, logger klog.Logger) *grpc.Server {
	return grpc.NewServer(
		grpc.Address(addr),
		grpc.Timeout(timeout),
		grpc.Middleware(
			recovery.Recovery(),
			logging.Server(logger),
		),
	)
}
