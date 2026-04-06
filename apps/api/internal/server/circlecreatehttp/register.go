package circlecreatehttp

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"api/internal/model"

	circledomain "api/internal/domain/circle"
	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
)

// CircleService is the domain subset used by these handlers.
type CircleService interface {
	CreateCircle(ctx context.Context, creatorID uuid.UUID, name, description string, tags []string, isPublic bool) (*model.Circle, error)
	InviteToCircle(ctx context.Context, circleID, inviterID, inviteeID uuid.UUID) error
}

// Authorizer extracts and validates session tokens.
type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

func Register(
	srv *kratoshttp.Server,
	circleSvc *circledomain.Service,
	authorizer Authorizer,
) {
	router := srv.Route("/api/v1/circles")
	// Overrides the proto-generated POST /api/v1/circles handler
	// (manual routes are registered before proto routes).
	router.POST("", wrapHandler(handleCreateCircle(circleSvc, authorizer)))
	router.POST("/{circle_id}/invite", wrapHandler(handleInviteToCircle(circleSvc, authorizer)))
}

func wrapHandler(handler http.HandlerFunc) func(kratoshttp.Context) error {
	return func(ctx kratoshttp.Context) error {
		handler(ctx.Response(), ctx.Request())
		return nil
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func authenticate(r *http.Request, authorizer Authorizer) (*uuid.UUID, bool) {
	token := extractToken(r, authorizer.CookieName())
	if token == "" {
		return nil, false
	}
	authState, err := authorizer.AuthenticateByToken(r.Context(), token)
	if err != nil || authState == nil || authState.User == nil {
		return nil, false
	}
	id := authState.User.ID
	return &id, true
}

func extractToken(r *http.Request, cookieName string) string {
	if header := strings.TrimSpace(r.Header.Get("Authorization")); strings.HasPrefix(header, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
	}
	if cookieName == "" {
		return ""
	}
	cookie, err := r.Cookie(cookieName)
	if err != nil || cookie == nil {
		return ""
	}
	return cookie.Value
}
