package server

import (
	"context"
	"time"

	profileservice "api/internal/api/profile"
	"api/internal/config"
	authmiddleware "api/internal/middleware"
	adminv1 "api/pkg/api/admin/v1"
	eventv1 "api/pkg/api/event/v1"
	geov1 "api/pkg/api/geo/v1"
	podcastv1 "api/pkg/api/podcast/v1"
	v1 "api/pkg/api/profile/v1"
	referralv1 "api/pkg/api/referral/v1"
	roomv1 "api/pkg/api/room/v1"

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
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

// serverCircuitBreaker returns a server-side circuit breaker middleware backed by the
// Google SRE adaptive throttling algorithm (aegis/sre).
func serverCircuitBreaker(breaker circuitbreaker.CircuitBreaker) middleware.Middleware {
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req any) (any, error) {
			if err := breaker.Allow(); err != nil {
				if tr, ok := transport.FromServerContext(ctx); ok {
					_ = tr // operation logged by logging middleware already
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

func NewHTTPServer(
	addr string,
	timeout time.Duration,
	profileService *profileservice.Implementation,
	authorizer authmiddleware.ProfileAuthorizer,
	cookies *SessionCookieManager,
	kLogger klog.Logger,
	rateLimitCfg *config.RateLimit,
	cbCfg *config.CircuitBreaker,
) *kratoshttp.Server {
	authMw := selector.Server(
		authmiddleware.RequireAuth(authorizer, cookies),
	).Match(func(_ context.Context, operation string) bool {
		return operation == v1.OperationProfileServiceCompleteRegistration ||
			operation == v1.OperationProfileServiceGetProfile ||
			operation == v1.OperationProfileServiceGetProfileByID ||
			operation == v1.OperationProfileServiceUpdateProfile ||
			operation == v1.OperationProfileServiceUpdateLocation ||
			operation == v1.OperationProfileServiceLogout ||
			operation == adminv1.OperationAdminServiceDeleteUser ||
			operation == geov1.OperationGeoServiceResolve ||
			operation == geov1.OperationGeoServiceCommunityMap ||
			operation == eventv1.OperationEventServiceListEvents ||
			operation == eventv1.OperationEventServiceCreateEvent ||
			operation == eventv1.OperationEventServiceJoinEvent ||
			operation == eventv1.OperationEventServiceLeaveEvent ||
			operation == eventv1.OperationEventServiceUpdateEvent ||
			operation == eventv1.OperationEventServiceDeleteEvent ||
			operation == podcastv1.OperationPodcastServiceListPodcasts ||
			operation == podcastv1.OperationPodcastServiceGetPodcast ||
			operation == podcastv1.OperationPodcastServiceCreatePodcast ||
			operation == podcastv1.OperationPodcastServiceUploadPodcast ||
			operation == podcastv1.OperationPodcastServicePreparePodcastUpload ||
			operation == podcastv1.OperationPodcastServiceCompletePodcastUpload ||
			operation == podcastv1.OperationPodcastServiceDeletePodcast ||
			operation == podcastv1.OperationPodcastServicePlayPodcast ||
			operation == referralv1.OperationReferralServiceListReferrals ||
			operation == referralv1.OperationReferralServiceCreateReferral ||
			operation == referralv1.OperationReferralServiceUpdateReferral ||
			operation == referralv1.OperationReferralServiceDeleteReferral ||
			operation == roomv1.OperationRoomServiceListRooms ||
			operation == roomv1.OperationRoomServiceGetRoom ||
			operation == roomv1.OperationRoomServiceCreateRoom ||
			operation == roomv1.OperationRoomServiceUpdateRoom ||
			operation == roomv1.OperationRoomServiceDeleteRoom ||
			operation == roomv1.OperationRoomServiceJoinRoomToken ||
			operation == roomv1.OperationRoomServiceGetRoomMediaState ||
			operation == roomv1.OperationRoomServiceUpsertRoomMediaState
	}).Build()

	adminMw := selector.Server(
		authmiddleware.RequireAdmin(),
	).Match(func(_ context.Context, operation string) bool {
		return operation == adminv1.OperationAdminServiceDeleteUser ||
			operation == podcastv1.OperationPodcastServiceCreatePodcast ||
			operation == podcastv1.OperationPodcastServiceUploadPodcast ||
			operation == podcastv1.OperationPodcastServicePreparePodcastUpload ||
			operation == podcastv1.OperationPodcastServiceCompletePodcastUpload ||
			operation == podcastv1.OperationPodcastServiceDeletePodcast
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
	cb := serverCircuitBreaker(sre.NewBreaker(
		sre.WithRequest(cbRequest),
		sre.WithSuccess(cbSuccess),
	))

	// Rate limiter with custom configuration
	var rateLimiter middleware.Middleware
	if rateLimitCfg != nil && rateLimitCfg.MaxCalls > 0 {
		rateLimiter = ratelimit.Server(ratelimit.WithLimiter(newFixedWindowLimiter(rateLimitCfg)))
	} else {
		// Default: unlimited for backward compatibility
		rateLimiter = ratelimit.Server()
	}

	srv := kratoshttp.NewServer(
		kratoshttp.Address(addr),
		kratoshttp.Timeout(timeout),
		kratoshttp.Middleware(
			recovery.Recovery(),
			logging.Server(kLogger),
			MetricsMiddleware(),
			rateLimiter,
			cb,
			authMw,
			adminMw,
		),
	)

	v1.RegisterProfileServiceHTTPServer(srv, profileService)
	return srv
}
