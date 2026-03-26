package main

import (
	"context"
	"net/http"
	_ "net/http/pprof"

	admindomainservice "api/internal/admin/service"
	adminservice "api/internal/api/admin"
	eventservice "api/internal/api/event"
	geoservice "api/internal/api/geo"
	podcastservice "api/internal/api/podcast"
	profileservice "api/internal/api/profile"
	referralservice "api/internal/api/referral"
	roomservice "api/internal/api/room"
	"api/internal/closer"
	"api/internal/config"
	eventdata "api/internal/data/event"
	geodata "api/internal/data/geo"
	podcastdata "api/internal/data/podcast"
	profiledata "api/internal/data/profile"
	referraldata "api/internal/data/referral"
	roomdata "api/internal/data/room"
	eventdomainservice "api/internal/event/service"
	geodomainservice "api/internal/geo/service"
	appLogger "api/internal/logger"
	podcastdomainservice "api/internal/podcast/service"
	profiledomainservice "api/internal/profile/service"
	referraldomainservice "api/internal/referral/service"
	roomdomainservice "api/internal/room/service"
	"api/internal/rtc"
	server "api/internal/server"
	livekitstorage "api/internal/storage/livekit"
	"api/internal/storage/postgres"
	s3storage "api/internal/storage/s3"
	adminv1 "api/pkg/api/admin/v1"
	eventv1 "api/pkg/api/event/v1"
	geov1 "api/pkg/api/geo/v1"
	podcastv1 "api/pkg/api/podcast/v1"
	referralv1 "api/pkg/api/referral/v1"
	roomv1 "api/pkg/api/room/v1"

	"github.com/go-kratos/kratos/v2"
	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// Run starts the API server.
func Run() (*kratos.App, *appLogger.Logger, error) {
	logger, err := appLogger.New()
	if err != nil {
		return nil, nil, err
	}
	closer.AddSync(logger.Sync)

	cfg, err := config.Load()
	if err != nil {
		return nil, nil, err
	}

	kratosLogger := klog.With(logger,
		"ts", klog.DefaultTimestamp,
		"caller", klog.DefaultCaller,
	)

	rtcPath := config.ResolveRTCValuesPath()
	_, rtcCleanup, err := rtc.NewManager(rtcPath, kratosLogger)
	if err != nil {
		return nil, nil, err
	}
	closer.AddSync(func() error {
		rtcCleanup()
		return nil
	})

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
	roomRepo := roomdata.NewRepo(store, kratosLogger)

	storageClient, err := s3storage.New(cfg.External.S3)
	if err != nil {
		return nil, nil, err
	}
	if err := storageClient.EnsureBucket(context.Background()); err != nil {
		return nil, nil, err
	}

	livekitClient := livekitstorage.New(cfg.External.LiveKit)
	geoClient := geodata.NewClient(cfg, store, kratosLogger)

	profileServiceDomain := profiledomainservice.NewProfileService(profiledomainservice.Config{
		Repository:     profileRepo,
		SessionStorage: profileRepo,
		Settings: profiledomainservice.Settings{
			BotToken:            cfg.External.Telegram.BotToken,
			DevBypass:           cfg.Dev.AuthBypass,
			CookieName:          cfg.Auth.Session.CookieName,
			SessionTTL:          cfg.Auth.Session.TTL,
			SessionRefreshAfter: cfg.Auth.Session.RefreshAfter,
			TelegramAuthMaxAge:  cfg.Auth.Session.TelegramAuthMaxAge,
		},
	})
	adminServiceDomain := admindomainservice.NewAdminService(admindomainservice.Config{
		ProfileRepository: profileRepo,
	})
	geoServiceDomain := geodomainservice.NewGeoService(geodomainservice.Config{
		Resolver: geoClient,
	})
	eventServiceDomain := eventdomainservice.NewEventService(eventdomainservice.Config{
		Repository: eventRepo,
	})
	podcastServiceDomain := podcastdomainservice.NewPodcastService(podcastdomainservice.Config{
		Repository: podcastRepo,
		Storage:    storageClient,
	})
	referralServiceDomain := referraldomainservice.NewReferralService(referraldomainservice.Config{
		Repository: referralRepo,
	})
	roomServiceDomain := roomdomainservice.NewRoomService(roomdomainservice.Config{
		Repository:  roomRepo,
		TokenIssuer: livekitClient,
	})

	cookies := server.NewSessionCookieManager(cfg.Auth.Session)
	adminService := adminservice.New(adminServiceDomain)
	profileService := profileservice.New(profileServiceDomain, cookies)
	geoService := geoservice.New(geoServiceDomain)
	eventService := eventservice.New(eventServiceDomain)
	podcastService := podcastservice.New(podcastServiceDomain)
	referralService := referralservice.New(referralServiceDomain)
	roomService := roomservice.New(roomServiceDomain)

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

	if err := server.RegisterHTTPProxy(
		httpServer,
		cfg.External.LiveKit,
		kratosLogger,
	); err != nil {
		return nil, nil, err
	}

	adminv1.RegisterAdminServiceHTTPServer(httpServer, adminService)
	adminv1.RegisterAdminServiceServer(grpcServer, adminService)
	geov1.RegisterGeoServiceHTTPServer(httpServer, geoService)
	geov1.RegisterGeoServiceServer(grpcServer, geoService)
	eventv1.RegisterEventServiceHTTPServer(httpServer, eventService)
	eventv1.RegisterEventServiceServer(grpcServer, eventService)
	podcastv1.RegisterPodcastServiceHTTPServer(httpServer, podcastService)
	podcastv1.RegisterPodcastServiceServer(grpcServer, podcastService)
	referralv1.RegisterReferralServiceHTTPServer(httpServer, referralService)
	referralv1.RegisterReferralServiceServer(grpcServer, referralService)
	roomv1.RegisterRoomServiceHTTPServer(httpServer, roomService)
	roomv1.RegisterRoomServiceServer(grpcServer, roomService)

	app := kratos.New(
		kratos.Name("api"),
		kratos.Server(httpServer, grpcServer),
		kratos.Logger(kratosLogger),
	)

	// Start metrics and pprof server
	if cfg.Metrics != nil && cfg.Metrics.Addr != "" {
		mux := http.NewServeMux()
		mux.Handle("/metrics", promhttp.Handler())

		// pprof handlers
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

		metricsServer := &http.Server{
			Addr:    cfg.Metrics.Addr,
			Handler: mux,
		}

		go func() {
			if err := metricsServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				klog.Errorf("metrics server error: %v", err)
			}
		}()

		closer.AddSync(func() error {
			return metricsServer.Close()
		})
	}

	return app, logger, nil
}
