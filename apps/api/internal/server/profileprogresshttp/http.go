package profileprogresshttp

import (
	"encoding/json"
	"net/http"
	"strings"

	profiledata "api/internal/data/profile"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

func handleGetProfileProgress(repo *profiledata.Repo, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if repo == nil || authorizer == nil {
			http.Error(w, "service unavailable", http.StatusServiceUnavailable)
			return
		}

		if _, ok := authenticate(r, authorizer); !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		userID, err := uuid.Parse(strings.TrimSpace(mux.Vars(r)["user_id"]))
		if err != nil {
			http.Error(w, "bad user id", http.StatusBadRequest)
			return
		}

		progress, err := repo.GetProfileProgress(r.Context(), userID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"progress": progress})
	}
}

func authenticate(r *http.Request, authorizer Authorizer) (*uuid.UUID, bool) {
	if r == nil || authorizer == nil {
		return nil, false
	}

	token := extractToken(r, authorizer.CookieName())
	if token == "" {
		return nil, false
	}
	authState, err := authorizer.AuthenticateByToken(r.Context(), token)
	if err != nil || authState == nil || authState.User == nil {
		return nil, false
	}
	userID := authState.User.ID
	return &userID, true
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

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
