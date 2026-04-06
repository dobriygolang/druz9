package server

import (
	"context"

	authmiddleware "api/internal/middleware"
	arenav1 "api/pkg/api/arena/v1"
	codeeditorv1 "api/pkg/api/code_editor/v1"
	interviewprepv1 "api/pkg/api/interview_prep/v1"
	profilev1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/middleware/selector"
)

// optionalAuthOperations are routes where auth is extracted if present but
// not required — anonymous access is allowed. All other proto routes require auth.
var optionalAuthOperations = map[string]struct{}{
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
	arenav1.OperationArenaServiceSubmitCode:                     {},
	interviewprepv1.OperationInterviewPrepServiceListCompanies:  {},
	interviewprepv1.OperationInterviewPrepServiceListTasks:      {},
	// Public endpoints that require no auth at all.
	"/admin.v1.AdminService/GetRuntimeConfig":                   {},
	codeeditorv1.OperationCodeEditorServiceGetDailyChallenge:    {},
	codeeditorv1.OperationCodeEditorServiceListRooms:            {},
}

// adminOperations are routes that additionally require the caller to be an admin.
// Auth (from the auth middleware above) runs first.
var adminOperations = map[string]struct{}{
	// Admin service
	"OperationAdminService": {}, // matched by prefix below — see matchAdmin
}

// Concrete admin operations (proto-generated constants used for exact matching).
var adminExactOperations = map[string]struct{}{
	"/admin.v1.AdminService/DeleteUser":                               {},
	"/admin.v1.AdminService/GetConfig":                                {},
	"/admin.v1.AdminService/ListConfig":                               {},
	"/admin.v1.AdminService/UpdateConfig":                             {},
	"/admin.v1.AdminService/UpdateUserTrust":                          {},
	"/admin.v1.AdminService/UpdateUserAdmin":                          {},
	"/code_editor.v1.CodeEditorService/CreateTask":                    {},
	"/code_editor.v1.CodeEditorService/UpdateTask":                    {},
	"/code_editor.v1.CodeEditorService/DeleteTask":                    {},
	"/podcast.v1.PodcastService/CreatePodcast":                        {},
	"/podcast.v1.PodcastService/UploadPodcast":                        {},
	"/podcast.v1.PodcastService/PreparePodcastUpload":                 {},
	"/podcast.v1.PodcastService/CompletePodcastUpload":                {},
	"/podcast.v1.PodcastService/DeletePodcast":                        {},
	"/interview_prep.v1.InterviewPrepService/ListAdminTasks":          {},
	"/interview_prep.v1.InterviewPrepService/CreateAdminTask":         {},
	"/interview_prep.v1.InterviewPrepService/GetAdminTask":            {},
	"/interview_prep.v1.InterviewPrepService/UpdateAdminTask":         {},
	"/interview_prep.v1.InterviewPrepService/DeleteAdminTask":         {},
	"/interview_prep.v1.InterviewPrepService/ListAdminQuestions":      {},
	"/interview_prep.v1.InterviewPrepService/CreateAdminQuestion":     {},
	"/interview_prep.v1.InterviewPrepService/UpdateAdminQuestion":     {},
	"/interview_prep.v1.InterviewPrepService/DeleteAdminQuestion":     {},
	"/interview_prep.v1.InterviewPrepService/ListMockQuestionPools":   {},
	"/interview_prep.v1.InterviewPrepService/CreateMockQuestionPool":  {},
	"/interview_prep.v1.InterviewPrepService/UpdateMockQuestionPool":  {},
	"/interview_prep.v1.InterviewPrepService/DeleteMockQuestionPool":  {},
	"/interview_prep.v1.InterviewPrepService/ListMockCompanyPresets":  {},
	"/interview_prep.v1.InterviewPrepService/CreateMockCompanyPreset": {},
	"/interview_prep.v1.InterviewPrepService/UpdateMockCompanyPreset": {},
	"/interview_prep.v1.InterviewPrepService/DeleteMockCompanyPreset": {},
}

// isOptional reports whether an operation allows anonymous access.
func isOptional(operation string) bool {
	_, ok := optionalAuthOperations[operation]
	return ok
}

// isAdmin reports whether an operation requires admin role.
func isAdmin(operation string) bool {
	_, ok := adminExactOperations[operation]
	return ok
}

// newHTTPAuthMiddleware requires auth on all operations except optional ones.
func newHTTPAuthMiddleware(authorizer authmiddleware.ProfileAuthorizer, cookies *SessionCookieManager, shouldRequireAuth func() bool) middleware.Middleware {
	return selector.Server(
		authmiddleware.RequireAuth(authorizer, cookies, shouldRequireAuth),
	).Match(func(_ context.Context, operation string) bool {
		return !isOptional(operation)
	}).Build()
}

// newHTTPOptionalAuthMiddleware injects auth when present, but never rejects.
func newHTTPOptionalAuthMiddleware(authorizer authmiddleware.ProfileAuthorizer, cookies *SessionCookieManager) middleware.Middleware {
	return selector.Server(
		authmiddleware.OptionalAuth(authorizer, cookies),
	).Match(func(_ context.Context, operation string) bool {
		return isOptional(operation)
	}).Build()
}

// newHTTPAdminMiddleware enforces admin role on admin-only operations.
func newHTTPAdminMiddleware() middleware.Middleware {
	return selector.Server(
		authmiddleware.RequireAdmin(),
	).Match(func(_ context.Context, operation string) bool {
		return isAdmin(operation)
	}).Build()
}

// newGRPCAuthMiddleware requires auth on all operations except optional ones.
func newGRPCAuthMiddleware(authorizer authmiddleware.ProfileAuthorizer, cookies *SessionCookieManager, shouldRequireAuth func() bool) middleware.Middleware {
	return selector.Server(
		authmiddleware.RequireAuth(authorizer, cookies, shouldRequireAuth),
	).Match(func(_ context.Context, operation string) bool {
		return !isOptional(operation)
	}).Build()
}

// newGRPCOptionalAuthMiddleware injects auth when present, but never rejects.
func newGRPCOptionalAuthMiddleware(authorizer authmiddleware.ProfileAuthorizer, cookies *SessionCookieManager) middleware.Middleware {
	return selector.Server(
		authmiddleware.OptionalAuth(authorizer, cookies),
	).Match(func(_ context.Context, operation string) bool {
		return isOptional(operation)
	}).Build()
}

// newGRPCAdminMiddleware enforces admin role on admin-only operations.
func newGRPCAdminMiddleware() middleware.Middleware {
	return selector.Server(
		authmiddleware.RequireAdmin(),
	).Match(func(_ context.Context, operation string) bool {
		return isAdmin(operation)
	}).Build()
}
