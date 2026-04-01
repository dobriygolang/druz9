package adminusershttp

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	profileerrors "api/internal/errors/profile"

	"github.com/google/uuid"
)

func handleUsers(repo Repo, authorizer Authorizer, cacheInvalidator CacheInvalidator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if !isAdmin(r, authorizer) {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		userID, ok := parseTrustUserID(r.URL.Path)
		if !ok {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		var req struct {
			IsTrusted bool `json:"isTrusted"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		if err := repo.UpdateUserTrusted(r.Context(), userID, req.IsTrusted); err != nil {
			if errors.Is(err, profileerrors.ErrUserNotFound) {
				http.Error(w, "user not found", http.StatusNotFound)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		cacheInvalidator.InvalidateProfileCache(userID)
		writeJSON(w, http.StatusOK, map[string]any{
			"status":    "ok",
			"isTrusted": req.IsTrusted,
		})
	}
}

func parseTrustUserID(path string) (uuid.UUID, bool) {
	trimmed := strings.TrimPrefix(path, Prefix)
	if !strings.HasSuffix(trimmed, "/trust") {
		return uuid.Nil, false
	}
	userIDRaw := strings.TrimSuffix(trimmed, "/trust")
	userIDRaw = strings.TrimSuffix(userIDRaw, "/")
	userID, err := uuid.Parse(userIDRaw)
	if err != nil {
		return uuid.Nil, false
	}
	return userID, true
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
