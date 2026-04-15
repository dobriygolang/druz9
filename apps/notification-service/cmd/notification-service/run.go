package main

import (
	"context"
	"os"

	notificationapi "notification-service/internal/api/notification"
	"notification-service/internal/bot"
	"notification-service/internal/closer"
	"notification-service/internal/config"
	"notification-service/internal/data"
	appLogger "notification-service/internal/logger"
	"notification-service/internal/rtc"
	"notification-service/internal/server"
	"notification-service/internal/service"
	"notification-service/internal/telegram"
	"notification-service/internal/worker"
	v1 "notification-service/pkg/notification/v1"

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

	dataLayer, cleanup, err := data.NewData(cfg.Data)
	if err != nil {
		return nil, nil, err
	}
	closer.AddSync(func() error {
		cleanup()
		return nil
	})

	// Telegram client.
	tgClient := telegram.NewClient(cfg.Telegram.BotToken)

	// Repository.
	repo := data.NewRepo(dataLayer)

	// Service.
	svc := service.New(repo, tgClient)

	// gRPC server with notification service registration.
	grpcServer := server.NewGRPCServer(cfg.Server.GRPC.Addr, cfg.Server.GRPC.Timeout, kratosLogger)
	notifServer := notificationapi.New(svc)
	v1.RegisterNotificationServiceServer(grpcServer, notifServer)

	// HTTP server exposes service health probes.
	httpServer := server.NewHTTPServer(cfg.Server.HTTP.Addr, cfg.Server.HTTP.Timeout, kratosLogger, func(ctx context.Context) error {
		return dataLayer.DB.Ping(ctx)
	})

	// Delivery workers.
	workerCount := 2
	if wc := realtimeConfig.GetValue(context.Background(), rtc.NotificationDeliveryWorkers).Uint64(); wc > 0 {
		workerCount = int(wc)
	}

	deliveryWorker := worker.NewDeliveryWorker(repo, tgClient, svc)
	workerCtx, workerCancel := context.WithCancel(context.Background())
	go deliveryWorker.Run(workerCtx, workerCount)
	closer.AddSync(func() error {
		workerCancel()
		return nil
	})

	// Telegram bot listener.
	if cfg.Telegram.BotToken != "" && cfg.API.GRPCAddr != "" {
		authAdapter, authErr := bot.NewGRPCAuthAdapter(cfg.API.GRPCAddr, cfg.Telegram.BotToken)
		if authErr != nil {
			return nil, nil, authErr
		}
		closer.AddSync(authAdapter.Close)

		tgBot := bot.New(cfg.Telegram.BotToken, tgClient, svc, repo, authAdapter)
		botCtx, botCancel := context.WithCancel(context.Background())
		go func() { _ = tgBot.Run(botCtx) }()
		closer.AddSync(func() error {
			botCancel()
			return nil
		})
	}

	app := kratos.New(
		kratos.Name("notification-service"),
		kratos.Server(httpServer, grpcServer),
		kratos.Logger(kratosLogger),
	)

	return app, logger, nil
}
