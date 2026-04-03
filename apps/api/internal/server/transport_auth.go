package server

import (
	"context"

	authmiddleware "api/internal/middleware"
	adminv1 "api/pkg/api/admin/v1"
	arenav1 "api/pkg/api/arena/v1"
	codeeditorv1 "api/pkg/api/code_editor/v1"
	eventv1 "api/pkg/api/event/v1"
	geov1 "api/pkg/api/geo/v1"
	interviewprepv1 "api/pkg/api/interview_prep/v1"
	podcastv1 "api/pkg/api/podcast/v1"
	profilev1 "api/pkg/api/profile/v1"
	referralv1 "api/pkg/api/referral/v1"

	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/middleware/selector"
)

var httpAuthOperations = map[string]struct{}{
	profilev1.OperationProfileServiceCompleteRegistration:                {},
	profilev1.OperationProfileServiceGetProfile:                          {},
	profilev1.OperationProfileServiceUpdateProfile:                       {},
	profilev1.OperationProfileServiceUpdateLocation:                      {},
	profilev1.OperationProfileServiceLogout:                              {},
	profilev1.OperationProfileServiceBindTelegram:                        {},
	adminv1.OperationAdminServiceDeleteUser:                              {},
	adminv1.OperationAdminServiceGetConfig:                               {},
	adminv1.OperationAdminServiceListConfig:                              {},
	adminv1.OperationAdminServiceUpdateConfig:                            {},
	geov1.OperationGeoServiceResolve:                                     {},
	geov1.OperationGeoServiceCommunityMap:                                {},
	eventv1.OperationEventServiceListEvents:                              {},
	eventv1.OperationEventServiceCreateEvent:                             {},
	eventv1.OperationEventServiceJoinEvent:                               {},
	eventv1.OperationEventServiceLeaveEvent:                              {},
	eventv1.OperationEventServiceUpdateEvent:                             {},
	eventv1.OperationEventServiceDeleteEvent:                             {},
	podcastv1.OperationPodcastServiceListPodcasts:                        {},
	podcastv1.OperationPodcastServiceGetPodcast:                          {},
	podcastv1.OperationPodcastServiceCreatePodcast:                       {},
	podcastv1.OperationPodcastServiceUploadPodcast:                       {},
	podcastv1.OperationPodcastServicePreparePodcastUpload:                {},
	podcastv1.OperationPodcastServiceCompletePodcastUpload:               {},
	podcastv1.OperationPodcastServiceDeletePodcast:                       {},
	podcastv1.OperationPodcastServicePlayPodcast:                         {},
	referralv1.OperationReferralServiceListReferrals:                     {},
	referralv1.OperationReferralServiceCreateReferral:                    {},
	referralv1.OperationReferralServiceUpdateReferral:                    {},
	referralv1.OperationReferralServiceDeleteReferral:                    {},
	interviewprepv1.OperationInterviewPrepServiceListTasks:               {},
	interviewprepv1.OperationInterviewPrepServiceStartSession:            {},
	interviewprepv1.OperationInterviewPrepServiceGetSession:              {},
	interviewprepv1.OperationInterviewPrepServiceSubmitSession:           {},
	interviewprepv1.OperationInterviewPrepServiceAnswerQuestion:          {},
	interviewprepv1.OperationInterviewPrepServiceReviewSystemDesign:      {},
	interviewprepv1.OperationInterviewPrepServiceStartMockSession:        {},
	interviewprepv1.OperationInterviewPrepServiceGetMockSession:          {},
	interviewprepv1.OperationInterviewPrepServiceSubmitMockStage:         {},
	interviewprepv1.OperationInterviewPrepServiceReviewMockSystemDesign:  {},
	interviewprepv1.OperationInterviewPrepServiceAnswerMockQuestion:      {},
	interviewprepv1.OperationInterviewPrepServiceListAdminTasks:          {},
	interviewprepv1.OperationInterviewPrepServiceCreateAdminTask:         {},
	interviewprepv1.OperationInterviewPrepServiceGetAdminTask:            {},
	interviewprepv1.OperationInterviewPrepServiceUpdateAdminTask:         {},
	interviewprepv1.OperationInterviewPrepServiceDeleteAdminTask:         {},
	interviewprepv1.OperationInterviewPrepServiceListAdminQuestions:      {},
	interviewprepv1.OperationInterviewPrepServiceCreateAdminQuestion:     {},
	interviewprepv1.OperationInterviewPrepServiceUpdateAdminQuestion:     {},
	interviewprepv1.OperationInterviewPrepServiceDeleteAdminQuestion:     {},
	interviewprepv1.OperationInterviewPrepServiceListMockQuestionPools:   {},
	interviewprepv1.OperationInterviewPrepServiceCreateMockQuestionPool:  {},
	interviewprepv1.OperationInterviewPrepServiceUpdateMockQuestionPool:  {},
	interviewprepv1.OperationInterviewPrepServiceDeleteMockQuestionPool:  {},
	interviewprepv1.OperationInterviewPrepServiceListMockCompanyPresets:  {},
	interviewprepv1.OperationInterviewPrepServiceCreateMockCompanyPreset: {},
	interviewprepv1.OperationInterviewPrepServiceUpdateMockCompanyPreset: {},
	interviewprepv1.OperationInterviewPrepServiceDeleteMockCompanyPreset: {},
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
	arenav1.OperationArenaServiceGetLeaderboard:                 {},
	arenav1.OperationArenaServiceGetPlayerStats:                 {},
	arenav1.OperationArenaServiceGetPlayerStatsBatch:            {},
	arenav1.OperationArenaServiceGetQueueStatus:                 {},
	arenav1.OperationArenaServiceJoinMatch:                      {},
	arenav1.OperationArenaServiceJoinQueue:                      {},
	arenav1.OperationArenaServiceListOpenMatches:                {},
	arenav1.OperationArenaServiceLeaveQueue:                     {},
	interviewprepv1.OperationInterviewPrepServiceListCompanies:  {},
	interviewprepv1.OperationInterviewPrepServiceListTasks:      {},
	arenav1.OperationArenaServiceSubmitCode:                     {},
}

var httpAdminOperations = map[string]struct{}{
	adminv1.OperationAdminServiceDeleteUser:                              {},
	codeeditorv1.OperationCodeEditorServiceCreateTask:                    {},
	codeeditorv1.OperationCodeEditorServiceUpdateTask:                    {},
	codeeditorv1.OperationCodeEditorServiceDeleteTask:                    {},
	podcastv1.OperationPodcastServiceCreatePodcast:                       {},
	podcastv1.OperationPodcastServiceUploadPodcast:                       {},
	podcastv1.OperationPodcastServicePreparePodcastUpload:                {},
	podcastv1.OperationPodcastServiceCompletePodcastUpload:               {},
	podcastv1.OperationPodcastServiceDeletePodcast:                       {},
	adminv1.OperationAdminServiceGetConfig:                               {},
	adminv1.OperationAdminServiceListConfig:                              {},
	adminv1.OperationAdminServiceUpdateConfig:                            {},
	interviewprepv1.OperationInterviewPrepServiceListAdminTasks:          {},
	interviewprepv1.OperationInterviewPrepServiceCreateAdminTask:         {},
	interviewprepv1.OperationInterviewPrepServiceGetAdminTask:            {},
	interviewprepv1.OperationInterviewPrepServiceUpdateAdminTask:         {},
	interviewprepv1.OperationInterviewPrepServiceDeleteAdminTask:         {},
	interviewprepv1.OperationInterviewPrepServiceListAdminQuestions:      {},
	interviewprepv1.OperationInterviewPrepServiceCreateAdminQuestion:     {},
	interviewprepv1.OperationInterviewPrepServiceUpdateAdminQuestion:     {},
	interviewprepv1.OperationInterviewPrepServiceDeleteAdminQuestion:     {},
	interviewprepv1.OperationInterviewPrepServiceListMockQuestionPools:   {},
	interviewprepv1.OperationInterviewPrepServiceCreateMockQuestionPool:  {},
	interviewprepv1.OperationInterviewPrepServiceUpdateMockQuestionPool:  {},
	interviewprepv1.OperationInterviewPrepServiceDeleteMockQuestionPool:  {},
	interviewprepv1.OperationInterviewPrepServiceListMockCompanyPresets:  {},
	interviewprepv1.OperationInterviewPrepServiceCreateMockCompanyPreset: {},
	interviewprepv1.OperationInterviewPrepServiceUpdateMockCompanyPreset: {},
	interviewprepv1.OperationInterviewPrepServiceDeleteMockCompanyPreset: {},
}

var grpcAuthOperations = map[string]struct{}{
	profilev1.ProfileService_CompleteRegistration_FullMethodName:                {},
	profilev1.ProfileService_GetProfile_FullMethodName:                          {},
	profilev1.ProfileService_UpdateProfile_FullMethodName:                       {},
	profilev1.ProfileService_UpdateLocation_FullMethodName:                      {},
	profilev1.ProfileService_Logout_FullMethodName:                              {},
	adminv1.AdminService_DeleteUser_FullMethodName:                              {},
	adminv1.AdminService_GetConfig_FullMethodName:                               {},
	adminv1.AdminService_ListConfig_FullMethodName:                              {},
	adminv1.AdminService_UpdateConfig_FullMethodName:                            {},
	geov1.GeoService_Resolve_FullMethodName:                                     {},
	geov1.GeoService_CommunityMap_FullMethodName:                                {},
	eventv1.EventService_ListEvents_FullMethodName:                              {},
	eventv1.EventService_CreateEvent_FullMethodName:                             {},
	eventv1.EventService_JoinEvent_FullMethodName:                               {},
	eventv1.EventService_LeaveEvent_FullMethodName:                              {},
	eventv1.EventService_UpdateEvent_FullMethodName:                             {},
	eventv1.EventService_DeleteEvent_FullMethodName:                             {},
	podcastv1.PodcastService_ListPodcasts_FullMethodName:                        {},
	podcastv1.PodcastService_GetPodcast_FullMethodName:                          {},
	podcastv1.PodcastService_CreatePodcast_FullMethodName:                       {},
	podcastv1.PodcastService_UploadPodcast_FullMethodName:                       {},
	podcastv1.PodcastService_PreparePodcastUpload_FullMethodName:                {},
	podcastv1.PodcastService_CompletePodcastUpload_FullMethodName:               {},
	podcastv1.PodcastService_DeletePodcast_FullMethodName:                       {},
	podcastv1.PodcastService_PlayPodcast_FullMethodName:                         {},
	referralv1.ReferralService_ListReferrals_FullMethodName:                     {},
	referralv1.ReferralService_CreateReferral_FullMethodName:                    {},
	referralv1.ReferralService_UpdateReferral_FullMethodName:                    {},
	referralv1.ReferralService_DeleteReferral_FullMethodName:                    {},
	interviewprepv1.InterviewPrepService_ListTasks_FullMethodName:               {},
	interviewprepv1.InterviewPrepService_StartSession_FullMethodName:            {},
	interviewprepv1.InterviewPrepService_GetSession_FullMethodName:              {},
	interviewprepv1.InterviewPrepService_SubmitSession_FullMethodName:           {},
	interviewprepv1.InterviewPrepService_AnswerQuestion_FullMethodName:          {},
	interviewprepv1.InterviewPrepService_ReviewSystemDesign_FullMethodName:      {},
	interviewprepv1.InterviewPrepService_StartMockSession_FullMethodName:        {},
	interviewprepv1.InterviewPrepService_GetMockSession_FullMethodName:          {},
	interviewprepv1.InterviewPrepService_SubmitMockStage_FullMethodName:         {},
	interviewprepv1.InterviewPrepService_ReviewMockSystemDesign_FullMethodName:  {},
	interviewprepv1.InterviewPrepService_AnswerMockQuestion_FullMethodName:      {},
	interviewprepv1.InterviewPrepService_ListAdminTasks_FullMethodName:          {},
	interviewprepv1.InterviewPrepService_CreateAdminTask_FullMethodName:         {},
	interviewprepv1.InterviewPrepService_GetAdminTask_FullMethodName:            {},
	interviewprepv1.InterviewPrepService_UpdateAdminTask_FullMethodName:         {},
	interviewprepv1.InterviewPrepService_DeleteAdminTask_FullMethodName:         {},
	interviewprepv1.InterviewPrepService_ListAdminQuestions_FullMethodName:      {},
	interviewprepv1.InterviewPrepService_CreateAdminQuestion_FullMethodName:     {},
	interviewprepv1.InterviewPrepService_UpdateAdminQuestion_FullMethodName:     {},
	interviewprepv1.InterviewPrepService_DeleteAdminQuestion_FullMethodName:     {},
	interviewprepv1.InterviewPrepService_ListMockQuestionPools_FullMethodName:   {},
	interviewprepv1.InterviewPrepService_CreateMockQuestionPool_FullMethodName:  {},
	interviewprepv1.InterviewPrepService_UpdateMockQuestionPool_FullMethodName:  {},
	interviewprepv1.InterviewPrepService_DeleteMockQuestionPool_FullMethodName:  {},
	interviewprepv1.InterviewPrepService_ListMockCompanyPresets_FullMethodName:  {},
	interviewprepv1.InterviewPrepService_CreateMockCompanyPreset_FullMethodName: {},
	interviewprepv1.InterviewPrepService_UpdateMockCompanyPreset_FullMethodName: {},
	interviewprepv1.InterviewPrepService_DeleteMockCompanyPreset_FullMethodName: {},
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
	arenav1.ArenaService_GetLeaderboard_FullMethodName:                 {},
	arenav1.ArenaService_GetPlayerStats_FullMethodName:                 {},
	arenav1.ArenaService_GetPlayerStatsBatch_FullMethodName:            {},
	arenav1.ArenaService_GetQueueStatus_FullMethodName:                 {},
	arenav1.ArenaService_JoinMatch_FullMethodName:                      {},
	arenav1.ArenaService_JoinQueue_FullMethodName:                      {},
	arenav1.ArenaService_ListOpenMatches_FullMethodName:                {},
	arenav1.ArenaService_LeaveQueue_FullMethodName:                     {},
	interviewprepv1.InterviewPrepService_ListCompanies_FullMethodName:  {},
	interviewprepv1.InterviewPrepService_ListTasks_FullMethodName:      {},
	arenav1.ArenaService_SubmitCode_FullMethodName:                     {},
}

var grpcAdminOperations = map[string]struct{}{
	adminv1.AdminService_DeleteUser_FullMethodName:                              {},
	adminv1.AdminService_GetConfig_FullMethodName:                               {},
	adminv1.AdminService_ListConfig_FullMethodName:                              {},
	adminv1.AdminService_UpdateConfig_FullMethodName:                            {},
	codeeditorv1.CodeEditorService_CreateTask_FullMethodName:                    {},
	codeeditorv1.CodeEditorService_UpdateTask_FullMethodName:                    {},
	codeeditorv1.CodeEditorService_DeleteTask_FullMethodName:                    {},
	interviewprepv1.InterviewPrepService_ListAdminTasks_FullMethodName:          {},
	interviewprepv1.InterviewPrepService_CreateAdminTask_FullMethodName:         {},
	interviewprepv1.InterviewPrepService_GetAdminTask_FullMethodName:            {},
	interviewprepv1.InterviewPrepService_UpdateAdminTask_FullMethodName:         {},
	interviewprepv1.InterviewPrepService_DeleteAdminTask_FullMethodName:         {},
	interviewprepv1.InterviewPrepService_ListAdminQuestions_FullMethodName:      {},
	interviewprepv1.InterviewPrepService_CreateAdminQuestion_FullMethodName:     {},
	interviewprepv1.InterviewPrepService_UpdateAdminQuestion_FullMethodName:     {},
	interviewprepv1.InterviewPrepService_DeleteAdminQuestion_FullMethodName:     {},
	interviewprepv1.InterviewPrepService_ListMockQuestionPools_FullMethodName:   {},
	interviewprepv1.InterviewPrepService_CreateMockQuestionPool_FullMethodName:  {},
	interviewprepv1.InterviewPrepService_UpdateMockQuestionPool_FullMethodName:  {},
	interviewprepv1.InterviewPrepService_DeleteMockQuestionPool_FullMethodName:  {},
	interviewprepv1.InterviewPrepService_ListMockCompanyPresets_FullMethodName:  {},
	interviewprepv1.InterviewPrepService_CreateMockCompanyPreset_FullMethodName: {},
	interviewprepv1.InterviewPrepService_UpdateMockCompanyPreset_FullMethodName: {},
	interviewprepv1.InterviewPrepService_DeleteMockCompanyPreset_FullMethodName: {},
	podcastv1.PodcastService_CreatePodcast_FullMethodName:                       {},
	podcastv1.PodcastService_UploadPodcast_FullMethodName:                       {},
	podcastv1.PodcastService_PreparePodcastUpload_FullMethodName:                {},
	podcastv1.PodcastService_CompletePodcastUpload_FullMethodName:               {},
	podcastv1.PodcastService_DeletePodcast_FullMethodName:                       {},
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
