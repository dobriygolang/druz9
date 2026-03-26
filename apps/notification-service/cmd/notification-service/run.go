package main

import (
	"context"
	"os"

	"notification-service/internal/closer"
	"notification-service/internal/config"
	"notification-service/internal/data"
	appLogger "notification-service/internal/logger"
	"notification-service/internal/rtc"
	"notification-service/internal/server"

	"github.com/go-kratos/kratos/v2"
	klog "github.com/go-kratos/kratos/v2/log"
)

func newApp() (*kratos.App, *appLogger.Logger, error) {
	logger, err := appLogger.New()
	if err != nil {
		return nil, nil, err
	}
	closer.AddSync(logger.Sync)

	cfg, err := config.Load()
	if err != nil {
		return nil, nil, err
	}

	kratosLogger := klog.With(
		logger,
		"ts", klog.DefaultTimestamp,
		"caller", klog.DefaultCaller,
	)

	rtcPath := os.Getenv("RTC_VALUES_PATH")
	if rtcPath == "" {
		rtcPath = ".platform/values.yaml"
	}
	realtimeConfig, rtcCleanup, err := rtc.NewManager(rtcPath, kratosLogger)
	if err != nil {
		return nil, nil, err
	}
	closer.AddSync(func() error {
		rtcCleanup()
		return nil
	})
	_ = realtimeConfig.GetValue(context.Background(), rtc.NotificationDeliveryWorkers)

	dataLayer, cleanup, err := data.NewData(cfg.Data)
	if err != nil {
		return nil, nil, err
	}
	closer.AddSync(func() error {
		cleanup()
		return nil
	})

	httpServer := server.NewHTTPServer(cfg.Server.HTTP.Addr, cfg.Server.HTTP.Timeout, kratosLogger)
	grpcServer := server.NewGRPCServer(cfg.Server.GRPC.Addr, cfg.Server.GRPC.Timeout, kratosLogger)

	app := kratos.New(
		kratos.Name("notification-service"),
		kratos.Server(httpServer, grpcServer),
		kratos.Logger(kratosLogger),
	)

	_ = dataLayer

	return app, logger, nil
}
