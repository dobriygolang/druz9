package server

import (
	"context"
	"time"

	profileservice "api/internal/api/profile"
	"api/internal/config"
	authmiddleware "api/internal/middleware"
	adminv1 "api/pkg/api/admin/v1"
	arenav1 "api/pkg/api/arena/v1"
	codeeditorv1 "api/pkg/api/code_editor/v1"
	eventv1 "api/pkg/api/event/v1"
	geov1 "api/pkg/api/geo/v1"
	podcastv1 "api/pkg/api/podcast/v1"
	v1 "api/pkg/api/profile/v1"
	referralv1 "api/pkg/api/referral/v1"

	"github.com/go-kratos/aegis/circuitbreaker"
	"github.com/go-kratos/aegis/circuitbreaker/sre"
	kratoserrpkg "github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/middleware/logging"
	"github.com/go-kratos/kratos/v2/middleware/ratelimit"
	"github.com/go-kratos/kratos/v2/middleware/recovery"
	"github.com/go-kratos/kratos/v2/middleware/selector"
	"github.com/go-kratos/kratos/v2/transport"
	kratosgrpc "github.com/go-kratos/kratos/v2/transport/grpc"
)

// grpcCircuitBreaker returns a gRPC server-side circuit breaker middleware.
func grpcCircuitBreaker(breaker circuitbreaker.CircuitBreaker) middleware.Middleware {
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req any) (any, error) {
			if err := breaker.Allow(); err != nil {
				if tr, ok := transport.FromServerContext(ctx); ok {
					_ = tr
				}
				breaker.MarkFailed()
				return nil, kratoserrpkg.New(503, "CIRCUITBREAKER", "service is temporarily unavailable, circuit open")
			}
			reply, err := handler(ctx, req)
			if err != nil && (kratoserrpkg.IsInternalServer(err) || kratoserrpkg.IsServiceUnavailable(err) || kratoserrpkg.IsGatewayTimeout(err)) {
				breaker.MarkFailed()
			} else {
				breaker.MarkSuccess()
			}
			return reply, err
		}
	}
}

func NewGRPCServer(
	addr string,
	timeout time.Duration,
	profileService *profileservice.Implementation,
	authorizer authmiddleware.ProfileAuthorizer,
	cookies *SessionCookieManager,
	kLogger klog.Logger,
	rateLimitCfg *config.RateLimit,
	cbCfg *config.CircuitBreaker,
) *kratosgrpc.Server {
	authMw := selector.Server(
		authmiddleware.RequireAuth(authorizer, cookies),
	).Match(func(_ context.Context, operation string) bool {
		return operation == v1.ProfileService_CompleteRegistration_FullMethodName ||
			operation == v1.ProfileService_GetProfile_FullMethodName ||
			operation == v1.ProfileService_UpdateProfile_FullMethodName ||
			operation == v1.ProfileService_UpdateLocation_FullMethodName ||
			operation == v1.ProfileService_Logout_FullMethodName ||
			operation == adminv1.AdminService_DeleteUser_FullMethodName ||
			operation == geov1.GeoService_Resolve_FullMethodName ||
			operation == geov1.GeoService_CommunityMap_FullMethodName ||
			operation == eventv1.EventService_ListEvents_FullMethodName ||
			operation == eventv1.EventService_CreateEvent_FullMethodName ||
			operation == eventv1.EventService_JoinEvent_FullMethodName ||
			operation == eventv1.EventService_LeaveEvent_FullMethodName ||
			operation == eventv1.EventService_UpdateEvent_FullMethodName ||
			operation == eventv1.EventService_DeleteEvent_FullMethodName ||
			operation == podcastv1.PodcastService_ListPodcasts_FullMethodName ||
			operation == podcastv1.PodcastService_GetPodcast_FullMethodName ||
			operation == podcastv1.PodcastService_CreatePodcast_FullMethodName ||
			operation == podcastv1.PodcastService_UploadPodcast_FullMethodName ||
			operation == podcastv1.PodcastService_PreparePodcastUpload_FullMethodName ||
			operation == podcastv1.PodcastService_CompletePodcastUpload_FullMethodName ||
			operation == podcastv1.PodcastService_DeletePodcast_FullMethodName ||
			operation == podcastv1.PodcastService_PlayPodcast_FullMethodName ||
			operation == referralv1.ReferralService_ListReferrals_FullMethodName ||
			operation == referralv1.ReferralService_CreateReferral_FullMethodName ||
			operation == referralv1.ReferralService_UpdateReferral_FullMethodName ||
			operation == referralv1.ReferralService_DeleteReferral_FullMethodName
	}).Build()

	optionalAuthMw := selector.Server(
		authmiddleware.OptionalAuth(authorizer, cookies),
	).Match(func(_ context.Context, operation string) bool {
		return operation == v1.ProfileService_GetProfileByID_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_CreateRoom_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_ListTasks_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_GetLeaderboard_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_GetRoom_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_GetSubmissions_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_JoinRoom_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_JoinRoomByInviteCode_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_LeaveRoom_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_SetReady_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_SubmitCode_FullMethodName ||
			operation == arenav1.ArenaService_CreateMatch_FullMethodName ||
			operation == arenav1.ArenaService_GetMatch_FullMethodName ||
			operation == arenav1.ArenaService_JoinMatch_FullMethodName ||
			operation == arenav1.ArenaService_SubmitCode_FullMethodName
	}).Build()

	adminMw := selector.Server(
		authmiddleware.RequireAdmin(),
	).Match(func(_ context.Context, operation string) bool {
		return operation == adminv1.AdminService_DeleteUser_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_CreateTask_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_UpdateTask_FullMethodName ||
			operation == codeeditorv1.CodeEditorService_DeleteTask_FullMethodName ||
			operation == podcastv1.PodcastService_CreatePodcast_FullMethodName ||
			operation == podcastv1.PodcastService_UploadPodcast_FullMethodName ||
			operation == podcastv1.PodcastService_PreparePodcastUpload_FullMethodName ||
			operation == podcastv1.PodcastService_CompletePodcastUpload_FullMethodName ||
			operation == podcastv1.PodcastService_DeletePodcast_FullMethodName
	}).Build()

	cbRequest := int64(100)
	cbSuccess := 0.6
	if cbCfg != nil {
		if cbCfg.Request > 0 {
			cbRequest = cbCfg.Request
		}
		if cbCfg.Success > 0 {
			cbSuccess = cbCfg.Success
		}
	}
	grpcCB := grpcCircuitBreaker(sre.NewBreaker(
		sre.WithRequest(cbRequest),
		sre.WithSuccess(cbSuccess),
	))

	// Rate limiter with custom configuration
	var rateLimiter middleware.Middleware
	if rateLimitCfg != nil && rateLimitCfg.MaxCalls > 0 {
		rateLimiter = ratelimit.Server(ratelimit.WithLimiter(newFixedWindowLimiter(rateLimitCfg)))
	} else {
		rateLimiter = ratelimit.Server()
	}

	srv := kratosgrpc.NewServer(
		kratosgrpc.Address(addr),
		kratosgrpc.Timeout(timeout),
		kratosgrpc.Middleware(
			recovery.Recovery(),
			logging.Server(kLogger),
			MetricsMiddleware(),
			rateLimiter,
			grpcCB,
			optionalAuthMw,
			authMw,
			adminMw,
		),
	)

	v1.RegisterProfileServiceServer(srv, profileService)
	return srv
}
