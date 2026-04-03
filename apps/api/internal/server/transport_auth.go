package server

import (
	"context"

	authmiddleware "api/internal/middleware"
	adminv1 "api/pkg/api/admin/v1"
	arenav1 "api/pkg/api/arena/v1"
	codeeditorv1 "api/pkg/api/code_editor/v1"
	eventv1 "api/pkg/api/event/v1"
	geov1 "api/pkg/api/geo/v1"
	podcastv1 "api/pkg/api/podcast/v1"
	profilev1 "api/pkg/api/profile/v1"
	referralv1 "api/pkg/api/referral/v1"

	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/middleware/selector"
)

var httpAuthOperations = map[string]struct{}{
	profilev1.OperationProfileServiceCompleteRegistration:  {},
	profilev1.OperationProfileServiceGetProfile:            {},
	profilev1.OperationProfileServiceUpdateProfile:         {},
	profilev1.OperationProfileServiceUpdateLocation:        {},
	profilev1.OperationProfileServiceLogout:                {},
	profilev1.OperationProfileServiceBindTelegram:          {},
	adminv1.OperationAdminServiceDeleteUser:                {},
	geov1.OperationGeoServiceResolve:                       {},
	geov1.OperationGeoServiceCommunityMap:                  {},
	eventv1.OperationEventServiceListEvents:                {},
	eventv1.OperationEventServiceCreateEvent:               {},
	eventv1.OperationEventServiceJoinEvent:                 {},
	eventv1.OperationEventServiceLeaveEvent:                {},
	eventv1.OperationEventServiceUpdateEvent:               {},
	eventv1.OperationEventServiceDeleteEvent:               {},
	podcastv1.OperationPodcastServiceListPodcasts:          {},
	podcastv1.OperationPodcastServiceGetPodcast:            {},
	podcastv1.OperationPodcastServiceCreatePodcast:         {},
	podcastv1.OperationPodcastServiceUploadPodcast:         {},
	podcastv1.OperationPodcastServicePreparePodcastUpload:  {},
	podcastv1.OperationPodcastServiceCompletePodcastUpload: {},
	podcastv1.OperationPodcastServiceDeletePodcast:         {},
	podcastv1.OperationPodcastServicePlayPodcast:           {},
	referralv1.OperationReferralServiceListReferrals:       {},
	referralv1.OperationReferralServiceCreateReferral:      {},
	referralv1.OperationReferralServiceUpdateReferral:      {},
	referralv1.OperationReferralServiceDeleteReferral:      {},
}

var httpOptionalAuthOperations = map[string]struct{}{
	profilev1.OperationProfileServiceGetProfileByID:             {},
	codeeditorv1.OperationCodeEditorServiceCreateRoom:           {},
	codeeditorv1.OperationCodeEditorServiceListTasks:            {},
	codeeditorv1.OperationCodeEditorServiceGetLeaderboard:       {},
	codeeditorv1.OperationCodeEditorServiceGetRoom:              {},
	codeeditorv1.OperationCodeEditorServiceGetSubmissions:       {},
	codeeditorv1.OperationCodeEditorServiceJoinRoom:             {},
	codeeditorv1.OperationCodeEditorServiceJoinRoomByInviteCode: {},
	codeeditorv1.OperationCodeEditorServiceLeaveRoom:            {},
	codeeditorv1.OperationCodeEditorServiceSetReady:             {},
	codeeditorv1.OperationCodeEditorServiceSubmitCode:           {},
	arenav1.OperationArenaServiceCreateMatch:                    {},
	arenav1.OperationArenaServiceGetMatch:                       {},
	arenav1.OperationArenaServiceJoinMatch:                      {},
	arenav1.OperationArenaServiceSubmitCode:                     {},
}

var httpAdminOperations = map[string]struct{}{
	adminv1.OperationAdminServiceDeleteUser:                {},
	codeeditorv1.OperationCodeEditorServiceCreateTask:      {},
	codeeditorv1.OperationCodeEditorServiceUpdateTask:      {},
	codeeditorv1.OperationCodeEditorServiceDeleteTask:      {},
	podcastv1.OperationPodcastServiceCreatePodcast:         {},
	podcastv1.OperationPodcastServiceUploadPodcast:         {},
	podcastv1.OperationPodcastServicePreparePodcastUpload:  {},
	podcastv1.OperationPodcastServiceCompletePodcastUpload: {},
	podcastv1.OperationPodcastServiceDeletePodcast:         {},
}

var grpcAuthOperations = map[string]struct{}{
	profilev1.ProfileService_CompleteRegistration_FullMethodName:  {},
	profilev1.ProfileService_GetProfile_FullMethodName:            {},
	profilev1.ProfileService_UpdateProfile_FullMethodName:         {},
	profilev1.ProfileService_UpdateLocation_FullMethodName:        {},
	profilev1.ProfileService_Logout_FullMethodName:                {},
	adminv1.AdminService_DeleteUser_FullMethodName:                {},
	geov1.GeoService_Resolve_FullMethodName:                       {},
	geov1.GeoService_CommunityMap_FullMethodName:                  {},
	eventv1.EventService_ListEvents_FullMethodName:                {},
	eventv1.EventService_CreateEvent_FullMethodName:               {},
	eventv1.EventService_JoinEvent_FullMethodName:                 {},
	eventv1.EventService_LeaveEvent_FullMethodName:                {},
	eventv1.EventService_UpdateEvent_FullMethodName:               {},
	eventv1.EventService_DeleteEvent_FullMethodName:               {},
	podcastv1.PodcastService_ListPodcasts_FullMethodName:          {},
	podcastv1.PodcastService_GetPodcast_FullMethodName:            {},
	podcastv1.PodcastService_CreatePodcast_FullMethodName:         {},
	podcastv1.PodcastService_UploadPodcast_FullMethodName:         {},
	podcastv1.PodcastService_PreparePodcastUpload_FullMethodName:  {},
	podcastv1.PodcastService_CompletePodcastUpload_FullMethodName: {},
	podcastv1.PodcastService_DeletePodcast_FullMethodName:         {},
	podcastv1.PodcastService_PlayPodcast_FullMethodName:           {},
	referralv1.ReferralService_ListReferrals_FullMethodName:       {},
	referralv1.ReferralService_CreateReferral_FullMethodName:      {},
	referralv1.ReferralService_UpdateReferral_FullMethodName:      {},
	referralv1.ReferralService_DeleteReferral_FullMethodName:      {},
}

var grpcOptionalAuthOperations = map[string]struct{}{
	profilev1.ProfileService_GetProfileByID_FullMethodName:             {},
	codeeditorv1.CodeEditorService_CreateRoom_FullMethodName:           {},
	codeeditorv1.CodeEditorService_ListTasks_FullMethodName:            {},
	codeeditorv1.CodeEditorService_GetLeaderboard_FullMethodName:       {},
	codeeditorv1.CodeEditorService_GetRoom_FullMethodName:              {},
	codeeditorv1.CodeEditorService_GetSubmissions_FullMethodName:       {},
	codeeditorv1.CodeEditorService_JoinRoom_FullMethodName:             {},
	codeeditorv1.CodeEditorService_JoinRoomByInviteCode_FullMethodName: {},
	codeeditorv1.CodeEditorService_LeaveRoom_FullMethodName:            {},
	codeeditorv1.CodeEditorService_SetReady_FullMethodName:             {},
	codeeditorv1.CodeEditorService_SubmitCode_FullMethodName:           {},
	arenav1.ArenaService_CreateMatch_FullMethodName:                    {},
	arenav1.ArenaService_GetMatch_FullMethodName:                       {},
	arenav1.ArenaService_JoinMatch_FullMethodName:                      {},
	arenav1.ArenaService_SubmitCode_FullMethodName:                     {},
}

var grpcAdminOperations = map[string]struct{}{
	adminv1.AdminService_DeleteUser_FullMethodName:                {},
	codeeditorv1.CodeEditorService_CreateTask_FullMethodName:      {},
	codeeditorv1.CodeEditorService_UpdateTask_FullMethodName:      {},
	codeeditorv1.CodeEditorService_DeleteTask_FullMethodName:      {},
	podcastv1.PodcastService_CreatePodcast_FullMethodName:         {},
	podcastv1.PodcastService_UploadPodcast_FullMethodName:         {},
	podcastv1.PodcastService_PreparePodcastUpload_FullMethodName:  {},
	podcastv1.PodcastService_CompletePodcastUpload_FullMethodName: {},
	podcastv1.PodcastService_DeletePodcast_FullMethodName:         {},
}

func newHTTPAuthMiddleware(authorizer authmiddleware.ProfileAuthorizer, cookies *SessionCookieManager) middleware.Middleware {
	return selector.Server(
		authmiddleware.RequireAuth(authorizer, cookies),
	).Match(matchOperation(httpAuthOperations)).Build()
}

func newHTTPOptionalAuthMiddleware(authorizer authmiddleware.ProfileAuthorizer, cookies *SessionCookieManager) middleware.Middleware {
	return selector.Server(
		authmiddleware.OptionalAuth(authorizer, cookies),
	).Match(matchOperation(httpOptionalAuthOperations)).Build()
}

func newHTTPAdminMiddleware() middleware.Middleware {
	return selector.Server(
		authmiddleware.RequireAdmin(),
	).Match(matchOperation(httpAdminOperations)).Build()
}

func newGRPCAuthMiddleware(authorizer authmiddleware.ProfileAuthorizer, cookies *SessionCookieManager) middleware.Middleware {
	return selector.Server(
		authmiddleware.RequireAuth(authorizer, cookies),
	).Match(matchOperation(grpcAuthOperations)).Build()
}

func newGRPCOptionalAuthMiddleware(authorizer authmiddleware.ProfileAuthorizer, cookies *SessionCookieManager) middleware.Middleware {
	return selector.Server(
		authmiddleware.OptionalAuth(authorizer, cookies),
	).Match(matchOperation(grpcOptionalAuthOperations)).Build()
}

func newGRPCAdminMiddleware() middleware.Middleware {
	return selector.Server(
		authmiddleware.RequireAdmin(),
	).Match(matchOperation(grpcAdminOperations)).Build()
}

func matchOperation(operations map[string]struct{}) func(context.Context, string) bool {
	return func(_ context.Context, operation string) bool {
		_, ok := operations[operation]
		return ok
	}
}
