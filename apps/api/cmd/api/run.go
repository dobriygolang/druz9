package main

import (
	"context"

	// #nosec G108 -- pprof is intentionally exposed on dedicated metrics endpoint in non-public ops context.
	_ "net/http/pprof"

	adminservice "api/internal/api/admin"
	arenaservice "api/internal/api/arena"
	codeeditorservice "api/internal/api/code_editor"
	eventservice "api/internal/api/event"
	geoservice "api/internal/api/geo"
	podcastservice "api/internal/api/podcast"
	profileservice "api/internal/api/profile"
	referralservice "api/internal/api/referral"
	apparenа "api/internal/app/arena"
	appcodeeditor "api/internal/app/codeeditor"
	"api/internal/closer"
	"api/internal/config"
	arenadata "api/internal/data/arena"
	codeeditordata "api/internal/data/code_editor"
	eventdata "api/internal/data/event"
	geodata "api/internal/data/geo"
	podcastdata "api/internal/data/podcast"
	profiledata "api/internal/data/profile"
	referraldata "api/internal/data/referral"
	admindomainservice "api/internal/domain/admin"
	eventdomainservice "api/internal/domain/event"
	geodomainservice "api/internal/domain/geo"
	podcastdomainservice "api/internal/domain/podcast"
	profiledomainservice "api/internal/domain/profile"
	referraldomainservice "api/internal/domain/referral"
	appLogger "api/internal/logger"
	"api/internal/realtime"
	"api/internal/rtc"
	"api/internal/sandbox"
	server "api/internal/server"
	"api/internal/storage/postgres"
	s3storage "api/internal/storage/s3"
	adminv1 "api/pkg/api/admin/v1"
	arenav1 "api/pkg/api/arena/v1"
	codeeditorv1 "api/pkg/api/code_editor/v1"
	eventv1 "api/pkg/api/event/v1"
	geov1 "api/pkg/api/geo/v1"
	podcastv1 "api/pkg/api/podcast/v1"
	referralv1 "api/pkg/api/referral/v1"

	"github.com/go-kratos/kratos/v2"
	klog "github.com/go-kratos/kratos/v2/log"
)

// Run starts the API server.
func Run() (*kratos.App, *appLogger.Logger, error) {
	logger, err := appLogger.New()
	if err != nil {
		return nil, nil, err
	}
	closer.AddSync(logger.Sync)

	kratosLogger := klog.With(logger,
		"ts", klog.DefaultTimestamp,
		"caller", klog.DefaultCaller,
	)

	rtcPath := config.ResolveRTCValuesPath()
	rtcManager, rtcCleanup, err := rtc.NewManager(rtcPath, kratosLogger)
	if err != nil {
		return nil, nil, err
	}
	closer.AddSync(func() error {
		rtcCleanup()
		return nil
	})

	cfg, err := config.Load(rtcManager)
	if err != nil {
		return nil, nil, err
	}

	poolCfg := postgres.DefaultPoolConfig()
	if cfg.Data.Pool != nil {
		if cfg.Data.Pool.MinConns > 0 {
			poolCfg.MinConns = cfg.Data.Pool.MinConns
		}
		if cfg.Data.Pool.MaxConns > 0 {
			poolCfg.MaxConns = cfg.Data.Pool.MaxConns
		}
		if cfg.Data.Pool.MaxConnLifetime > 0 {
			poolCfg.MaxConnLifetime = cfg.Data.Pool.MaxConnLifetime
		}
		if cfg.Data.Pool.MaxConnIdleTime > 0 {
			poolCfg.MaxConnIdleTime = cfg.Data.Pool.MaxConnIdleTime
		}
		if cfg.Data.Pool.HealthCheckPeriod > 0 {
			poolCfg.HealthCheckPeriod = cfg.Data.Pool.HealthCheckPeriod
		}
	}
	store, cleanup, err := postgres.New(cfg.Data, poolCfg)
	if err != nil {
		return nil, nil, err
	}
	closer.AddSync(func() error {
		cleanup()
		return nil
	})

	profileRepo := profiledata.NewRepo(store, kratosLogger)
	eventRepo := eventdata.NewRepo(store, kratosLogger)
	podcastRepo := podcastdata.NewRepo(store, kratosLogger)
	referralRepo := referraldata.NewRepo(store, kratosLogger)
	codeEditorRepo := codeeditordata.NewRepo(store, kratosLogger)
	arenaRepo := arenadata.NewRepo(store, kratosLogger)

	realtimeHub := realtime.NewCodeEditorHub(codeEditorRepo)

	// Create sandbox service for code execution
	sandboxService := sandbox.New()

	storageClient, err := s3storage.New(cfg.External.S3)
	if err != nil {
		return nil, nil, err
	}
	if err := storageClient.EnsureBucket(context.Background()); err != nil {
		return nil, nil, err
	}

	geoClient := geodata.NewClient(cfg, store, kratosLogger)

	profileServiceDomain := profiledomainservice.NewProfileService(profiledomainservice.Config{
		Repository:     profileRepo,
		SessionStorage: profileRepo,
		Settings: profiledomainservice.Settings{
			BotToken:            cfg.External.Telegram.BotToken,
			DevBypass:           cfg.Dev.AuthBypass,
			DevUserID:           cfg.Dev.DevUserID,
			CookieName:          cfg.Auth.Session.CookieName,
			SessionTTL:          cfg.Auth.Session.TTL,
			SessionRefreshAfter: cfg.Auth.Session.RefreshAfter,
			TelegramAuthMaxAge:  cfg.Auth.Session.TelegramAuthMaxAge,
		},
	})
	adminServiceDomain := admindomainservice.NewService(admindomainservice.Config{
		ProfileRepository: profileRepo,
	})
	geoServiceDomain := geodomainservice.NewGeoService(geodomainservice.Config{
		Resolver: geoClient,
	})
	eventServiceDomain := eventdomainservice.NewService(eventdomainservice.Config{
		Repository: eventRepo,
	})
	podcastServiceDomain := podcastdomainservice.NewPodcastService(podcastdomainservice.Config{
		Repository: podcastRepo,
		Storage:    storageClient,
	})
	referralServiceDomain := referraldomainservice.NewReferralService(referraldomainservice.Config{
		Repository: referralRepo,
	})
	codeEditorServiceDomain := appcodeeditor.New(appcodeeditor.Config{
		Repository: codeEditorRepo,
		Sandbox:    sandboxService,
	})
	arenaServiceDomain := apparenа.New(apparenа.Config{
		Repository: arenaRepo,
		Sandbox:    sandboxService,
		AllowGuestAccess: func() bool {
			return cfg.Arena != nil && !cfg.Arena.RequireAuth
		},
		AntiCheatEnabled: func() bool {
			return true
		},
	})
	arenaRealtimeHub := realtime.NewArenaHub(arenaServiceDomain)
	closer.AddSync(startCodeRoomCleanupWorker(kratosLogger, codeEditorServiceDomain))
	closer.AddSync(startArenaCleanupWorker(kratosLogger, arenaServiceDomain))

	cookies := server.NewSessionCookieManager(cfg.Auth.Session)
	adminService := adminservice.New(adminServiceDomain)
	profileService := profileservice.New(profileServiceDomain, cookies)
	geoService := geoservice.New(geoServiceDomain)
	eventService := eventservice.New(eventServiceDomain)
	podcastService := podcastservice.New(podcastServiceDomain)
	referralService := referralservice.New(referralServiceDomain)
	codeEditorService := codeeditorservice.New(codeEditorServiceDomain, realtimeHub)
	arenaService := arenaservice.New(arenaServiceDomain, arenaRealtimeHub, func() bool {
		return cfg.Arena != nil && !cfg.Arena.RequireAuth
	})

	httpServer := server.NewHTTPServer(
		cfg.Server.HTTP.Addr,
		cfg.Server.HTTP.Timeout,
		profileService,
		profileServiceDomain,
		cookies,
		kratosLogger,
		cfg.Server.RateLimit,
		cfg.Server.CircuitBreaker,
	)
	grpcServer := server.NewGRPCServer(
		cfg.Server.GRPC.Addr,
		cfg.Server.GRPC.Timeout,
		profileService,
		profileServiceDomain,
		cookies,
		kratosLogger,
		cfg.Server.RateLimit,
		cfg.Server.CircuitBreaker,
	)

	server.RegisterCodeEditorRealtime(httpServer, realtimeHub)
	server.RegisterArenaRealtime(httpServer, arenaRealtimeHub)
	server.RegisterArenaOpenMatches(httpServer, arenaServiceDomain)
	server.RegisterArenaQueue(httpServer, arenaServiceDomain, profileServiceDomain)

	adminv1.RegisterAdminServiceHTTPServer(httpServer, adminService)
	adminv1.RegisterAdminServiceServer(grpcServer, adminService)
	arenav1.RegisterArenaServiceHTTPServer(httpServer, arenaService)
	arenav1.RegisterArenaServiceServer(grpcServer, arenaService)
	geov1.RegisterGeoServiceHTTPServer(httpServer, geoService)
	geov1.RegisterGeoServiceServer(grpcServer, geoService)
	eventv1.RegisterEventServiceHTTPServer(httpServer, eventService)
	eventv1.RegisterEventServiceServer(grpcServer, eventService)
	podcastv1.RegisterPodcastServiceHTTPServer(httpServer, podcastService)
	podcastv1.RegisterPodcastServiceServer(grpcServer, podcastService)
	referralv1.RegisterReferralServiceHTTPServer(httpServer, referralService)
	referralv1.RegisterReferralServiceServer(grpcServer, referralService)
	codeeditorv1.RegisterCodeEditorServiceHTTPServer(httpServer, codeEditorService)
	codeeditorv1.RegisterCodeEditorServiceServer(grpcServer, codeEditorService)

	app := kratos.New(
		kratos.Name("api"),
		kratos.Server(httpServer, grpcServer),
		kratos.Logger(kratosLogger),
	)

	opsServer := server.NewOpsServer(cfg.Metrics)
	if opsServer != nil {
		server.StartOpsServer(kratosLogger, opsServer)
		closer.AddSync(func() error {
			return opsServer.Close()
		})
	}

	return app, logger, nil
}
