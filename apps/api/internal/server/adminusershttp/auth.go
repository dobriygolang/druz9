package adminusershttp

import (
	"net/http"
	"strings"
)

func isAdmin(r *http.Request, authorizer Authorizer) bool {
	if r == nil || authorizer == nil {
		return false
	}
	token := extractToken(r, authorizer.CookieName())
	if token == "" {
		return false
	}
	authState, err := authorizer.AuthenticateByToken(r.Context(), token)
	if err != nil || authState == nil || authState.User == nil {
		return false
	}
	return authState.User.IsAdmin
}

func extractToken(r *http.Request, cookieName string) string {
	if r == nil {
		return ""
	}
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
