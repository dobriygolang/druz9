package main

import (
	"api/internal/closer"
	challengedomain "api/internal/domain/challenge"
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
	"github.com/google/uuid"
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
	// Start the Telegram bot only if notification-service is NOT running its own bot.
	// When NOTIFICATION_SERVICE_ADDR is set, the bot lives in notification-service.
	if bootstrap.cfg.External.NotificationService == nil || bootstrap.cfg.External.NotificationService.Addr == "" {
		closer.AddSync(startTelegramBotWorker(services.profileServiceDomain, services.notificationSender))
	}
	closer.AddSync(startStreakWarningWorker(services.notificationSender, storage.store.DB))
	closer.AddSync(startCircleDigestWorker(services.notificationSender, storage.store.DB))
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

	registerMissionRoutes(r, auth, services)
	registerChallengeRoutes(r, auth, services)
}

func registerMissionRoutes(
	r *kratoshttp.Router,
	auth server.Authorizer,
	services *serviceContext,
) {
	missionSvc := services.missionServiceDomain

	// GET /api/v1/missions/daily — get today's 3 daily missions with progress.
	r.GET("/api/v1/missions/daily", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		userID, ok := server.Authenticate(req, auth)
		if !ok {
			ctx.Response().WriteHeader(http.StatusUnauthorized)
			return nil
		}
		result, err := missionSvc.GetDailyMissions(req.Context(), *userID)
		if err != nil {
			server.WriteJSON(ctx.Response(), http.StatusInternalServerError, map[string]string{"error": "internal"})
			return nil
		}
		server.WriteJSON(ctx.Response(), http.StatusOK, result)
		return nil
	})

	// POST /api/v1/missions/{mission_key}/complete — explicitly mark a mission as done.
	r.POST("/api/v1/missions/{mission_key}/complete", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		userID, ok := server.Authenticate(req, auth)
		if !ok {
			ctx.Response().WriteHeader(http.StatusUnauthorized)
			return nil
		}
		missionKey := server.PathSegment(req.URL.Path, "missions", 1)
		if missionKey == "" {
			ctx.Response().WriteHeader(http.StatusBadRequest)
			return nil
		}
		if err := missionSvc.CompleteMission(req.Context(), *userID, missionKey); err != nil {
			server.WriteJSON(ctx.Response(), http.StatusInternalServerError, map[string]string{"error": "internal"})
			return nil
		}
		server.WriteJSON(ctx.Response(), http.StatusOK, map[string]bool{"ok": true})
		return nil
	})
}

func registerChallengeRoutes(
	r *kratoshttp.Router,
	auth server.Authorizer,
	services *serviceContext,
) {
	svc := services.challengeServiceDomain

	// POST /api/v1/challenges/daily/submit-review — record AI score for daily challenge
	r.POST("/api/v1/challenges/daily/submit-review", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		userID, ok := server.Authenticate(req, auth)
		if !ok {
			ctx.Response().WriteHeader(http.StatusUnauthorized)
			return nil
		}
		var body struct {
			TaskID  string `json:"taskId"`
			AIScore int32  `json:"aiScore"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			ctx.Response().WriteHeader(http.StatusBadRequest)
			return nil
		}
		taskUUID, err := uuid.Parse(body.TaskID)
		if err != nil {
			server.WriteJSON(ctx.Response(), http.StatusBadRequest, map[string]string{"error": "invalid task ID"})
			return nil
		}
		if err := svc.SubmitDailyReview(req.Context(), *userID, taskUUID, body.AIScore); err != nil {
			server.WriteJSON(ctx.Response(), http.StatusInternalServerError, map[string]string{"error": "internal"})
			return nil
		}
		server.WriteJSON(ctx.Response(), http.StatusOK, map[string]bool{"ok": true})
		return nil
	})

	// GET /api/v1/challenges/daily/leaderboard — today's top 10 by AI score
	r.GET("/api/v1/challenges/daily/leaderboard", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		if _, ok := server.Authenticate(req, auth); !ok {
			ctx.Response().WriteHeader(http.StatusUnauthorized)
			return nil
		}
		results, err := svc.GetDailyLeaderboard(req.Context(), 10)
		if err != nil {
			server.WriteJSON(ctx.Response(), http.StatusInternalServerError, map[string]string{"error": "internal"})
			return nil
		}
		server.WriteJSON(ctx.Response(), http.StatusOK, map[string]any{"entries": results})
		return nil
	})

	// GET /api/v1/challenges/blind-review — get random code for review
	r.GET("/api/v1/challenges/blind-review", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		userID, ok := server.Authenticate(req, auth)
		if !ok {
			ctx.Response().WriteHeader(http.StatusUnauthorized)
			return nil
		}
		task, err := svc.GetBlindReviewTask(req.Context(), *userID)
		if err != nil || task == nil {
			server.WriteJSON(ctx.Response(), http.StatusNotFound, map[string]string{"error": "no tasks available"})
			return nil
		}
		server.WriteJSON(ctx.Response(), http.StatusOK, task)
		return nil
	})

	// POST /api/v1/challenges/blind-review/submit — submit code review for AI evaluation
	r.POST("/api/v1/challenges/blind-review/submit", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		userID, ok := server.Authenticate(req, auth)
		if !ok {
			ctx.Response().WriteHeader(http.StatusUnauthorized)
			return nil
		}
		var body struct {
			SourceReviewID string `json:"sourceReviewId"`
			TaskID         string `json:"taskId"`
			SourceCode     string `json:"sourceCode"`
			SourceLanguage string `json:"sourceLanguage"`
			UserReview     string `json:"userReview"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			ctx.Response().WriteHeader(http.StatusBadRequest)
			return nil
		}
		srcID, err := uuid.Parse(body.SourceReviewID)
		if err != nil {
			server.WriteJSON(ctx.Response(), http.StatusBadRequest, map[string]string{"error": "invalid source review ID"})
			return nil
		}
		taskUUID, err := uuid.Parse(body.TaskID)
		if err != nil {
			server.WriteJSON(ctx.Response(), http.StatusBadRequest, map[string]string{"error": "invalid task ID"})
			return nil
		}
		result, err := svc.SubmitBlindReview(req.Context(), *userID, srcID, taskUUID, body.SourceCode, body.SourceLanguage, body.UserReview)
		if err != nil {
			server.WriteJSON(ctx.Response(), http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return nil
		}
		server.WriteJSON(ctx.Response(), http.StatusOK, result)
		return nil
	})

	// GET /api/v1/challenges/speed-run/records — user's personal bests
	r.GET("/api/v1/challenges/speed-run/records", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		userID, ok := server.Authenticate(req, auth)
		if !ok {
			ctx.Response().WriteHeader(http.StatusUnauthorized)
			return nil
		}
		records, err := svc.GetUserRecords(req.Context(), *userID, 20)
		if err != nil {
			server.WriteJSON(ctx.Response(), http.StatusInternalServerError, map[string]string{"error": "internal"})
			return nil
		}
		server.WriteJSON(ctx.Response(), http.StatusOK, map[string]any{"records": records})
		return nil
	})

	// POST /api/v1/challenges/speed-run/record — record a speed-run attempt
	r.POST("/api/v1/challenges/speed-run/record", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		userID, ok := server.Authenticate(req, auth)
		if !ok {
			ctx.Response().WriteHeader(http.StatusUnauthorized)
			return nil
		}
		var body struct {
			TaskID  string `json:"taskId"`
			TimeMs  int64  `json:"timeMs"`
			AIScore int32  `json:"aiScore"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			ctx.Response().WriteHeader(http.StatusBadRequest)
			return nil
		}
		taskUUID, err := uuid.Parse(body.TaskID)
		if err != nil {
			server.WriteJSON(ctx.Response(), http.StatusBadRequest, map[string]string{"error": "invalid task ID"})
			return nil
		}
		result, err := svc.RecordSpeedRun(req.Context(), *userID, taskUUID, body.TimeMs, body.AIScore)
		if err != nil {
			server.WriteJSON(ctx.Response(), http.StatusInternalServerError, map[string]string{"error": "internal"})
			return nil
		}
		server.WriteJSON(ctx.Response(), http.StatusOK, result)
		return nil
	})

	// GET /api/v1/challenges/weekly — current weekly boss challenge + leaderboard
	r.GET("/api/v1/challenges/weekly", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		userID, ok := server.Authenticate(req, auth)
		if !ok {
			ctx.Response().WriteHeader(http.StatusUnauthorized)
			return nil
		}
		weekKey := challengedomain.CurrentWeekKey()
		leaderboard, _ := svc.GetWeeklyLeaderboard(req.Context(), weekKey, 10)
		userEntry, _ := svc.GetUserWeeklyEntry(req.Context(), *userID, weekKey)
		server.WriteJSON(ctx.Response(), http.StatusOK, map[string]any{
			"weekKey":     weekKey,
			"endsAt":      challengedomain.WeekEndsAt(),
			"leaderboard": leaderboard,
			"myEntry":     userEntry,
		})
		return nil
	})

	// POST /api/v1/challenges/weekly/submit — submit a weekly boss attempt
	r.POST("/api/v1/challenges/weekly/submit", func(ctx kratoshttp.Context) error {
		req := ctx.Request()
		userID, ok := server.Authenticate(req, auth)
		if !ok {
			ctx.Response().WriteHeader(http.StatusUnauthorized)
			return nil
		}
		var body struct {
			TaskID      string `json:"taskId"`
			AIScore     int32  `json:"aiScore"`
			SolveTimeMs int64  `json:"solveTimeMs"`
			Code        string `json:"code"`
			Language    string `json:"language"`
		}
		if err := json.NewDecoder(req.Body).Decode(&body); err != nil {
			ctx.Response().WriteHeader(http.StatusBadRequest)
			return nil
		}
		taskUUID, err := uuid.Parse(body.TaskID)
		if err != nil {
			server.WriteJSON(ctx.Response(), http.StatusBadRequest, map[string]string{"error": "invalid task ID"})
			return nil
		}
		weekKey := challengedomain.CurrentWeekKey()
		if err := svc.SubmitWeeklyBoss(req.Context(), *userID, weekKey, taskUUID, body.AIScore, body.SolveTimeMs, body.Code, body.Language); err != nil {
			server.WriteJSON(ctx.Response(), http.StatusInternalServerError, map[string]string{"error": "internal"})
			return nil
		}
		server.WriteJSON(ctx.Response(), http.StatusOK, map[string]bool{"ok": true})
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
