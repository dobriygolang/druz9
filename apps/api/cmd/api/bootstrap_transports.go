package main

import (
	"api/internal/closer"
	server "api/internal/server"
	"api/internal/server/wshandler"
	adminv1 "api/pkg/api/admin/v1"
	arenav1 "api/pkg/api/arena/v1"
	circlev1 "api/pkg/api/circle/v1"
	codeeditorv1 "api/pkg/api/code_editor/v1"
	eventv1 "api/pkg/api/event/v1"
	geov1 "api/pkg/api/geo/v1"
	interviewprepv1 "api/pkg/api/interview_prep/v1"
	podcastv1 "api/pkg/api/podcast/v1"
	profilev1 "api/pkg/api/profile/v1"
	referralv1 "api/pkg/api/referral/v1"

	"encoding/json"
	"net/http"

	"github.com/go-kratos/kratos/v2"
	kratosgrpc "github.com/go-kratos/kratos/v2/transport/grpc"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

func initializeTransports(
	bootstrap *bootstrapContext,
	storage *storageContext,
	services *serviceContext,
) (*kratos.App, error) {
	registerBackgroundWorkers(bootstrap, storage, services)

	httpServer := server.NewHTTPServer(
		bootstrap.cfg.Server.HTTP.Addr,
		bootstrap.cfg.Server.HTTP.Timeout,
		services.profileServiceDomain,
		services.cookies,
		func() bool { return bootstrap.cfg.Auth != nil && bootstrap.cfg.Auth.RequireAuth },
		bootstrap.kratosLogger,
		bootstrap.cfg.Server.RateLimit,
		bootstrap.cfg.Server.CircuitBreaker,
	)
	grpcServer := server.NewGRPCServer(
		bootstrap.cfg.Server.GRPC.Addr,
		bootstrap.cfg.Server.GRPC.Timeout,
		services.profileServiceDomain,
		services.cookies,
		func() bool { return bootstrap.cfg.Auth != nil && bootstrap.cfg.Auth.RequireAuth },
		bootstrap.kratosLogger,
		bootstrap.cfg.Server.RateLimit,
		bootstrap.cfg.Server.CircuitBreaker,
	)

	registerManualHTTPRoutes(httpServer, bootstrap, storage, services)
	registerAPIServices(httpServer, grpcServer, services)

	app := kratos.New(
		kratos.Name("api"),
		kratos.Server(httpServer, grpcServer),
		kratos.Logger(bootstrap.kratosLogger),
	)

	opsServer := server.NewOpsServer(bootstrap.cfg.Metrics)
	if opsServer != nil {
		server.StartOpsServer(bootstrap.kratosLogger, opsServer)
		closer.AddSync(func() error { return opsServer.Close() })
	}

	return app, nil
}

func registerBackgroundWorkers(bootstrap *bootstrapContext, storage *storageContext, services *serviceContext) {
	closer.AddSync(startCodeRoomCleanupWorker(bootstrap.kratosLogger, bootstrap.rtcManager, services.codeEditorServiceDomain))
	closer.AddSync(startArenaCleanupWorker(bootstrap.kratosLogger, bootstrap.rtcManager, services.arenaServiceDomain))
	closer.AddSync(startContentCleanupWorker(bootstrap.kratosLogger, storage))
	closer.AddSync(startBusinessMetricsWorker(bootstrap.kratosLogger, bootstrap.rtcManager, storage))
	closer.AddSync(startTelegramBotWorker(services.profileServiceDomain))
}

func registerManualHTTPRoutes(
	httpServer *kratoshttp.Server,
	_ *bootstrapContext,
	_ *storageContext,
	services *serviceContext,
) {
	// Realtime WebSocket endpoints (cannot be expressed as proto RPCs).
	wshandler.Register(httpServer, services.realtimeHub, services.arenaRealtimeHub, services.profileServiceDomain)

	// Manual code-editor room routes not covered by proto HTTP annotations.
	// Registered via Route() so they don't shadow proto-generated GET/POST/DELETE handlers.
	auth := services.profileServiceDomain
	svc := services.codeEditorServiceDomain

	r := httpServer.Route("/")

	// PATCH /api/v1/code-editor/rooms/{room_id} — update room task and/or privacy
	r.PATCH("/api/v1/code-editor/rooms/{room_id}", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		userID, ok := server.Authenticate(req, auth)
		if !ok {
			ctx.Response().WriteHeader(http.StatusUnauthorized)
			return nil
		}
		var body struct {
			Task      string `json:"task"`
			IsPrivate *bool  `json:"isPrivate,omitempty"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			ctx.Response().WriteHeader(http.StatusBadRequest)
			return nil
		}
		roomID := server.PathSegment(req.URL.Path, "rooms", 1)
		if body.Task != "" {
			if err := svc.SetRoomTaskByString(req.Context(), roomID, userID, body.Task); err != nil {
				ctx.Response().WriteHeader(http.StatusForbidden)
				return nil
			}
		}
		if body.IsPrivate != nil {
			if err := svc.SetRoomPrivacyByString(req.Context(), roomID, userID, *body.IsPrivate); err != nil {
				ctx.Response().WriteHeader(http.StatusForbidden)
				return nil
			}
		}
		ctx.Response().WriteHeader(http.StatusNoContent)
		return nil
	})

	// POST /api/v1/code-editor/rooms/{room_id}/close — close room
	r.POST("/api/v1/code-editor/rooms/{room_id}/close", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		userID, ok := server.Authenticate(req, auth)
		if !ok {
			ctx.Response().WriteHeader(http.StatusUnauthorized)
			return nil
		}
		roomID := server.PathSegment(req.URL.Path, "rooms", 1)
		if err := svc.CloseRoomByString(req.Context(), roomID, userID); err != nil {
			ctx.Response().WriteHeader(http.StatusForbidden)
			return nil
		}
		ctx.Response().WriteHeader(http.StatusNoContent)
		return nil
	})
}

func registerAPIServices(httpServer *kratoshttp.Server, grpcServer *kratosgrpc.Server, services *serviceContext) {
	profilev1.RegisterProfileServiceHTTPServer(httpServer, services.profileService)
	profilev1.RegisterProfileServiceServer(grpcServer, services.profileService)

	adminv1.RegisterAdminServiceHTTPServer(httpServer, services.adminService)
	adminv1.RegisterAdminServiceServer(grpcServer, services.adminService)

	arenav1.RegisterArenaServiceHTTPServer(httpServer, services.arenaService)
	arenav1.RegisterArenaServiceServer(grpcServer, services.arenaService)

	interviewprepv1.RegisterInterviewPrepServiceHTTPServer(httpServer, services.interviewPrepService)
	interviewprepv1.RegisterInterviewPrepServiceServer(grpcServer, services.interviewPrepService)

	geov1.RegisterGeoServiceHTTPServer(httpServer, services.geoService)
	geov1.RegisterGeoServiceServer(grpcServer, services.geoService)

	circlev1.RegisterCircleServiceHTTPServer(httpServer, services.circleService)
	circlev1.RegisterCircleServiceServer(grpcServer, services.circleService)

	eventv1.RegisterEventServiceHTTPServer(httpServer, services.eventService)
	eventv1.RegisterEventServiceServer(grpcServer, services.eventService)

	podcastv1.RegisterPodcastServiceHTTPServer(httpServer, services.podcastService)
	podcastv1.RegisterPodcastServiceServer(grpcServer, services.podcastService)

	referralv1.RegisterReferralServiceHTTPServer(httpServer, services.referralService)
	referralv1.RegisterReferralServiceServer(grpcServer, services.referralService)

	codeeditorv1.RegisterCodeEditorServiceHTTPServer(httpServer, services.codeEditorService)
	codeeditorv1.RegisterCodeEditorServiceServer(grpcServer, services.codeEditorService)
}
