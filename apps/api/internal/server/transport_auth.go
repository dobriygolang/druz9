package server

import (
	"context"
	"strings"

	authmiddleware "api/internal/middleware"
	codeeditorv1 "api/pkg/api/code_editor/v1"
	profilev1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/middleware/selector"
)

// Auth model (per product decision, 2026-Q2):
//
//   - Only the collaborative code editor and the auth flow itself are
//     available to anonymous visitors. Everything else (arena, guild,
//     interview prep, shop, profile progress, …) sits behind
//     RequireAuth and should redirect the client to /login when missing.
//   - "Optional auth" means the handler runs, but ctx will only contain
//     a user if one happens to be signed in. Handlers MUST branch on
//     `model.UserFromContext(ctx)` and never assume presence.
//   - Admin-only routes (dashboards, content CRUD) run the admin
//     selector after auth so an ordinary user hits 403 instead of 401.

// publicOperations is the ALLOW-LIST of routes reachable without auth.
// Anything not in this list falls into newHTTPAuthMiddleware → 401 when
// there's no session. Kept small and explicit — review with ruthless
// pressure before adding anything here.
var publicOperations = map[string]struct{}{
	// ── Auth flow (can't require auth before you log in) ──
	profilev1.OperationProfileServiceStartYandexAuth:             {},
	profilev1.OperationProfileServiceYandexAuth:                  {},
	profilev1.OperationProfileServiceTelegramAuth:                {},
	profilev1.OperationProfileServiceCreateTelegramAuthChallenge: {},
	profilev1.OperationProfileServiceConfirmTelegramAuth:         {},
	profilev1.OperationProfileServiceCompleteRegistration:        {},

	// ── Collaborative code editor (public sandboxing is the product) ──
	codeeditorv1.OperationCodeEditorServiceCreateRoom:           {},
	codeeditorv1.OperationCodeEditorServiceGetRoom:              {},
	codeeditorv1.OperationCodeEditorServiceJoinRoom:             {},
	codeeditorv1.OperationCodeEditorServiceJoinRoomByInviteCode: {},
	codeeditorv1.OperationCodeEditorServiceLeaveRoom:            {},
	codeeditorv1.OperationCodeEditorServiceSetReady:             {},
	codeeditorv1.OperationCodeEditorServiceSubmitCode:           {},
	codeeditorv1.OperationCodeEditorServiceListRooms:            {},
	codeeditorv1.OperationCodeEditorServiceListTasks:            {},
	codeeditorv1.OperationCodeEditorServiceGetLeaderboard:       {},
	codeeditorv1.OperationCodeEditorServiceGetDailyChallenge:    {},

	// ── Runtime feature flags (client needs them pre-auth to decide
	// whether to show the login screen at all) ──
	"/admin.v1.AdminService/GetRuntimeConfig": {},
}

// adminExactOperations are routes that require admin role AFTER auth.
// Hit by auth middleware first (→ 401), then by admin selector (→ 403).
var adminExactOperations = map[string]struct{}{
	// Admin service (user management, runtime config CRUD)
	"/admin.v1.AdminService/DeleteUser":      {},
	"/admin.v1.AdminService/GetConfig":       {},
	"/admin.v1.AdminService/ListConfig":      {},
	"/admin.v1.AdminService/UpdateConfig":    {},
	"/admin.v1.AdminService/UpdateUserTrust": {},
	"/admin.v1.AdminService/UpdateUserAdmin": {},

	// Code editor admin (task CRUD)
	"/code_editor.v1.CodeEditorService/CreateTask": {},
	"/code_editor.v1.CodeEditorService/UpdateTask": {},
	"/code_editor.v1.CodeEditorService/DeleteTask": {},

	// Podcast admin (upload/delete)
	"/podcast.v1.PodcastService/CreatePodcast":         {},
	"/podcast.v1.PodcastService/UploadPodcast":         {},
	"/podcast.v1.PodcastService/PreparePodcastUpload":  {},
	"/podcast.v1.PodcastService/CompletePodcastUpload": {},
	"/podcast.v1.PodcastService/DeletePodcast":         {},

	// Interview prep admin (task + question pool CRUD)
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

func isPublic(operation string) bool {
	_, ok := publicOperations[operation]
	return ok
}

// isAdmin reports whether an operation requires admin role.
// Exact-match table above, plus a prefix safety net for the entire
// AdminService namespace — we'd rather accidentally gate an extra admin
// endpoint than miss one when someone adds a new RPC.
func isAdmin(operation string) bool {
	if _, ok := adminExactOperations[operation]; ok {
		return true
	}
	return strings.HasPrefix(operation, "/admin.v1.AdminService/") && operation != "/admin.v1.AdminService/GetRuntimeConfig"
}

// ── HTTP middleware ────────────────────────────────────────────────────

func newHTTPAuthMiddleware(authorizer authmiddleware.ProfileAuthorizer, cookies *SessionCookieManager, shouldRequireAuth func() bool) middleware.Middleware {
	return selector.Server(
		authmiddleware.RequireAuth(authorizer, cookies, shouldRequireAuth),
	).Match(func(_ context.Context, operation string) bool {
		return !isPublic(operation)
	}).Build()
}

func newHTTPOptionalAuthMiddleware(authorizer authmiddleware.ProfileAuthorizer, cookies *SessionCookieManager) middleware.Middleware {
	return selector.Server(
		authmiddleware.OptionalAuth(authorizer, cookies),
	).Match(func(_ context.Context, operation string) bool {
		return isPublic(operation)
	}).Build()
}

func newHTTPAdminMiddleware() middleware.Middleware {
	return selector.Server(
		authmiddleware.RequireAdmin(),
	).Match(func(_ context.Context, operation string) bool {
		return isAdmin(operation)
	}).Build()
}

// ── gRPC middleware (mirrors HTTP; same allow-list) ────────────────────

func newGRPCAuthMiddleware(authorizer authmiddleware.ProfileAuthorizer, cookies *SessionCookieManager, shouldRequireAuth func() bool) middleware.Middleware {
	return selector.Server(
		authmiddleware.RequireAuth(authorizer, cookies, shouldRequireAuth),
	).Match(func(_ context.Context, operation string) bool {
		return !isPublic(operation)
	}).Build()
}

func newGRPCOptionalAuthMiddleware(authorizer authmiddleware.ProfileAuthorizer, cookies *SessionCookieManager) middleware.Middleware {
	return selector.Server(
		authmiddleware.OptionalAuth(authorizer, cookies),
	).Match(func(_ context.Context, operation string) bool {
		return isPublic(operation)
	}).Build()
}

func newGRPCAdminMiddleware() middleware.Middleware {
	return selector.Server(
		authmiddleware.RequireAdmin(),
	).Match(func(_ context.Context, operation string) bool {
		return isAdmin(operation)
	}).Build()
}
