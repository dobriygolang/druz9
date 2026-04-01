package main

import (
	"api/internal/closer"
	"api/internal/config"
	appLogger "api/internal/logger"
	"api/internal/rtc"

	klog "github.com/go-kratos/kratos/v2/log"
)

type bootstrapContext struct {
	logger       *appLogger.Logger
	kratosLogger klog.Logger
	cfg          *config.Bootstrap
	rtcManager   *rtc.Manager
}

func initializeBootstrap() (*bootstrapContext, error) {
	logger, err := appLogger.New()
	if err != nil {
		return nil, err
	}
	closer.AddSync(logger.Sync)

	kratosLogger := klog.With(logger,
		"ts", klog.DefaultTimestamp,
		"caller", klog.DefaultCaller,
	)

	rtcPath := config.ResolveRTCValuesPath()
	rtcManager, rtcCleanup, err := rtc.NewManager(rtcPath, kratosLogger)
	if err != nil {
		return nil, err
	}
	closer.AddSync(func() error {
		rtcCleanup()
		return nil
	})

	cfg, err := config.Load(rtcManager)
	if err != nil {
		return nil, err
	}

	return &bootstrapContext{
		logger:       logger,
		kratosLogger: kratosLogger,
		cfg:          cfg,
		rtcManager:   rtcManager,
	}, nil
}
