package main

import (
	interviewlive "api/internal/api/interview_live"
	profileservice "api/internal/api/profile"
	"api/internal/closer"
	server "api/internal/server"
	"api/internal/server/wshandler"
	adminv1 "api/pkg/api/admin/v1"
	arenav1 "api/pkg/api/arena/v1"
	challengev1 "api/pkg/api/challenge/v1"
	codeeditorv1 "api/pkg/api/code_editor/v1"
	duelreplayv1 "api/pkg/api/duel_replay/v1"
	eventv1 "api/pkg/api/event/v1"
	friendchallengev1 "api/pkg/api/friend_challenge/v1"
	geov1 "api/pkg/api/geo/v1"
	guildv1 "api/pkg/api/guild/v1"
	hubv1 "api/pkg/api/hub/v1"
	inboxv1 "api/pkg/api/inbox/v1"
	interviewprepv1 "api/pkg/api/interview_prep/v1"
	missionv1 "api/pkg/api/mission/v1"
	notificationv1 "api/pkg/api/notification/v1"
	podcastv1 "api/pkg/api/podcast/v1"
	profilev1 "api/pkg/api/profile/v1"
	referralv1 "api/pkg/api/referral/v1"
	seasonpassv1 "api/pkg/api/season_pass/v1"
	shopv1 "api/pkg/api/shop/v1"
	skillsv1 "api/pkg/api/skills/v1"
	socialv1 "api/pkg/api/social/v1"
	streakv1 "api/pkg/api/streak/v1"
	trainingv1 "api/pkg/api/training/v1"

	"net/http"

	"github.com/go-kratos/kratos/v2"
	kratosgrpc "github.com/go-kratos/kratos/v2/transport/grpc"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
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
		bootstrap.cfg.Server.AllowedOrigins,
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
	closer.AddSync(startFriendChallengeSweepWorker(bootstrap.kratosLogger, services.friendChallengeDomain))
	closer.AddSync(startBusinessMetricsWorker(bootstrap.kratosLogger, bootstrap.rtcManager, storage))
	// Start the Telegram bot only if notification-service is NOT running its own bot.
	// When NOTIFICATION_SERVICE_ADDR is set, the bot lives in notification-service.
	if bootstrap.cfg.External.NotificationService == nil || bootstrap.cfg.External.NotificationService.Addr == "" {
		closer.AddSync(startTelegramBotWorker(services.profileServiceDomain, services.notificationSender))
	}
	closer.AddSync(startStreakWarningWorker(services.notificationSender, storage.store.DB))
	closer.AddSync(startGuildDigestWorker(services.notificationSender, storage.store.DB))
}

func registerManualHTTPRoutes(
	httpServer *kratoshttp.Server,
	_ *bootstrapContext,
	_ *storageContext,
	services *serviceContext,
) {
	// Realtime WebSocket endpoints (cannot be expressed as proto RPCs).
	wshandler.Register(httpServer, services.realtimeHub, services.arenaRealtimeHub, services.profileServiceDomain)

	liveChatHandler := interviewlive.New(services.aiReviewer)

	r := httpServer.Route("/")

	// POST /api/v1/interview/live/chat — live interview AI mentor chat.
	r.POST("/api/v1/interview/live/chat", liveChatHandler.Chat)

	// GET /api/v1/profile/avatar/{user_id} — serves a fresh Telegram avatar.
	// Stays manual: response is a binary image, not a JSON proto message.
	r.GET("/api/v1/profile/avatar/{user_id}", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		userID, err := uuid.Parse(server.PathSegment(req.URL.Path, "avatar", 1))
		if err != nil {
			ctx.Response().WriteHeader(http.StatusBadRequest)
			return nil
		}

		body, contentType, err := services.profileServiceDomain.FetchTelegramAvatar(req.Context(), userID)
		if err != nil {
			ctx.Response().WriteHeader(http.StatusNotFound)
			return nil
		}

		if contentType == "" {
			contentType = "image/jpeg"
		}
		ctx.Response().Header().Set("Content-Type", contentType)
		ctx.Response().Header().Set("Cache-Control", "private, max-age=300")
		ctx.Response().WriteHeader(http.StatusOK)
		_, _ = ctx.Response().Write(body)
		return nil
	})
}

func registerAPIServices(httpServer *kratoshttp.Server, grpcServer *kratosgrpc.Server, services *serviceContext) {
	profilev1.RegisterProfileServiceHTTPServer(httpServer, services.profileService)
	profileservice.RegisterCompatProfileServiceServer(grpcServer, services.profileService)

	adminv1.RegisterAdminServiceHTTPServer(httpServer, services.adminService)
	adminv1.RegisterAdminServiceServer(grpcServer, services.adminService)

	arenav1.RegisterArenaServiceHTTPServer(httpServer, services.arenaService)
	arenav1.RegisterArenaServiceServer(grpcServer, services.arenaService)

	interviewprepv1.RegisterInterviewPrepServiceHTTPServer(httpServer, services.interviewPrepService)
	interviewprepv1.RegisterInterviewPrepServiceServer(grpcServer, services.interviewPrepService)

	geov1.RegisterGeoServiceHTTPServer(httpServer, services.geoService)
	geov1.RegisterGeoServiceServer(grpcServer, services.geoService)

	hubv1.RegisterHubServiceHTTPServer(httpServer, services.hubService)
	hubv1.RegisterHubServiceServer(grpcServer, services.hubService)

	guildv1.RegisterGuildServiceHTTPServer(httpServer, services.guildService)
	guildv1.RegisterGuildServiceServer(grpcServer, services.guildService)

	eventv1.RegisterEventServiceHTTPServer(httpServer, services.eventService)
	eventv1.RegisterEventServiceServer(grpcServer, services.eventService)

	podcastv1.RegisterPodcastServiceHTTPServer(httpServer, services.podcastService)
	podcastv1.RegisterPodcastServiceServer(grpcServer, services.podcastService)

	referralv1.RegisterReferralServiceHTTPServer(httpServer, services.referralService)
	referralv1.RegisterReferralServiceServer(grpcServer, services.referralService)

	skillsv1.RegisterSkillsServiceHTTPServer(httpServer, services.skillsService)
	skillsv1.RegisterSkillsServiceServer(grpcServer, services.skillsService)

	trainingv1.RegisterTrainingServiceHTTPServer(httpServer, services.trainingService)
	trainingv1.RegisterTrainingServiceServer(grpcServer, services.trainingService)

	codeeditorv1.RegisterCodeEditorServiceHTTPServer(httpServer, services.codeEditorService)
	codeeditorv1.RegisterCodeEditorServiceServer(grpcServer, services.codeEditorService)

	missionv1.RegisterMissionServiceHTTPServer(httpServer, services.missionService)
	missionv1.RegisterMissionServiceServer(grpcServer, services.missionService)
	inboxv1.RegisterInboxServiceHTTPServer(httpServer, services.inboxService)
	inboxv1.RegisterInboxServiceServer(grpcServer, services.inboxService)
	friendchallengev1.RegisterFriendChallengeServiceHTTPServer(httpServer, services.friendChallengeService)
	friendchallengev1.RegisterFriendChallengeServiceServer(grpcServer, services.friendChallengeService)
	duelreplayv1.RegisterDuelReplayServiceHTTPServer(httpServer, services.duelReplayService)
	duelreplayv1.RegisterDuelReplayServiceServer(grpcServer, services.duelReplayService)
	seasonpassv1.RegisterSeasonPassServiceHTTPServer(httpServer, services.seasonPassService)
	seasonpassv1.RegisterSeasonPassServiceServer(grpcServer, services.seasonPassService)
	streakv1.RegisterStreakServiceHTTPServer(httpServer, services.streakService)
	streakv1.RegisterStreakServiceServer(grpcServer, services.streakService)
	shopv1.RegisterShopServiceHTTPServer(httpServer, services.shopService)
	shopv1.RegisterShopServiceServer(grpcServer, services.shopService)
	socialv1.RegisterSocialServiceHTTPServer(httpServer, services.socialService)
	socialv1.RegisterSocialServiceServer(grpcServer, services.socialService)

	notificationv1.RegisterNotificationSettingsServiceHTTPServer(httpServer, services.notificationSettings)
	notificationv1.RegisterNotificationSettingsServiceServer(grpcServer, services.notificationSettings)

	challengev1.RegisterChallengeServiceHTTPServer(httpServer, services.challengeService)
	challengev1.RegisterChallengeServiceServer(grpcServer, services.challengeService)
}
