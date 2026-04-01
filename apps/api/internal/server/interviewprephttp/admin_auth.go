package interviewprephttp

import (
	"encoding/json"
	"net/http"
	"strings"

	"api/internal/model"
)

type adminAuthError struct {
	status   int
	response map[string]any
}

func adminCheckAuth(r *http.Request, authorizer AdminAuthorizer) (*model.User, *adminAuthError) {
	if r == nil || authorizer == nil {
		return nil, &adminAuthError{status: http.StatusUnauthorized, response: map[string]any{"error": "unauthorized"}}
	}

	if token := adminToken(r, authorizer.CookieName()); token != "" {
		authState, err := authorizer.AuthenticateByToken(r.Context(), token)
		if err == nil && authState != nil && authState.User != nil {
			return authState.User, nil
		}
	}
	return nil, &adminAuthError{status: http.StatusUnauthorized, response: map[string]any{"error": "unauthorized"}}
}

func adminToken(r *http.Request, cookieName string) string {
	if r == nil {
		return ""
	}

	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}

	cookie, err := r.Cookie(cookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}

func writeAdminJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
