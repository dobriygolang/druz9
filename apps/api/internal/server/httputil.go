package server

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"api/internal/model"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
)

// Authorizer validates session tokens used by manual HTTP route handlers.
// Proto-based handlers rely on the kratos middleware instead.
type Authorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

// wrapKratos adapts a standard http.HandlerFunc to kratos route registration.
func wrapKratos(h http.HandlerFunc) func(kratoshttp.Context) error {
	return func(ctx kratoshttp.Context) error {
		h(ctx.Response(), ctx.Request())
		return nil
	}
}

// writeJSON encodes payload as JSON with the given status code.
func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// Authenticate is the exported version of authenticate for use outside the server package.
func Authenticate(r *http.Request, auth Authorizer) (*uuid.UUID, bool) {
	return authenticate(r, auth)
}

// PathSegment is the exported version of pathSegment for use outside the server package.
func PathSegment(path, key string, offset int) string {
	return pathSegment(path, key, offset)
}

// authenticate extracts and validates a session token, returning the caller's UUID.
func authenticate(r *http.Request, auth Authorizer) (*uuid.UUID, bool) {
	if r == nil || auth == nil {
		return nil, false
	}
	token := sessionToken(r, auth.CookieName())
	if token == "" {
		return nil, false
	}
	state, err := auth.AuthenticateByToken(r.Context(), token)
	if err != nil || state == nil || state.User == nil {
		return nil, false
	}
	id := state.User.ID
	return &id, true
}

// authenticateUser is like authenticate but returns the full User model.
func authenticateUser(r *http.Request, auth Authorizer) (*model.User, bool) {
	if r == nil || auth == nil {
		return nil, false
	}
	token := sessionToken(r, auth.CookieName())
	if token == "" {
		return nil, false
	}
	state, err := auth.AuthenticateByToken(r.Context(), token)
	if err != nil || state == nil || state.User == nil {
		return nil, false
	}
	return state.User, true
}

// authenticateAdmin returns true only if the caller is an admin.
func authenticateAdmin(r *http.Request, auth Authorizer) bool {
	user, ok := authenticateUser(r, auth)
	return ok && user.IsAdmin
}

// sessionToken extracts a Bearer token from the Authorization header or cookie.
func sessionToken(r *http.Request, cookieName string) string {
	if r == nil {
		return ""
	}
	if h := strings.TrimSpace(r.Header.Get("Authorization")); strings.HasPrefix(h, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
	}
	if cookieName == "" {
		return ""
	}
	if c, err := r.Cookie(cookieName); err == nil && c != nil {
		return c.Value
	}
	return ""
}

// pathSegment returns the URL segment that appears `offset` positions after `key`.
// Example: path="/api/v1/circles/abc/members", key="circles", offset=1 → "abc"
func pathSegment(path, key string, offset int) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for i, p := range parts {
		if p == key && i+offset < len(parts) {
			return parts[i+offset]
		}
	}
	return ""
}
