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

		userID, field, ok := parseUserPatchPath(r.URL.Path)
		if !ok {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		var req struct {
			IsTrusted bool `json:"isTrusted"`
			IsAdmin   bool `json:"isAdmin"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		payload := map[string]any{"status": "ok"}
		var err error
		switch field {
		case "trust":
			err = repo.UpdateUserTrusted(r.Context(), userID, req.IsTrusted)
			payload["isTrusted"] = req.IsTrusted
		case "admin":
			err = repo.UpdateUserAdmin(r.Context(), userID, req.IsAdmin)
			payload["isAdmin"] = req.IsAdmin
		default:
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		if err != nil {
			if errors.Is(err, profileerrors.ErrUserNotFound) {
				http.Error(w, "user not found", http.StatusNotFound)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		cacheInvalidator.InvalidateProfileCache(userID)
		writeJSON(w, http.StatusOK, payload)
	}
}

func parseUserPatchPath(path string) (uuid.UUID, string, bool) {
	trimmed := strings.TrimPrefix(path, Prefix)
	switch {
	case strings.HasSuffix(trimmed, "/trust"):
		userIDRaw := strings.TrimSuffix(trimmed, "/trust")
		userIDRaw = strings.TrimSuffix(userIDRaw, "/")
		userID, err := uuid.Parse(userIDRaw)
		if err != nil {
			return uuid.Nil, "", false
		}
		return userID, "trust", true
	case strings.HasSuffix(trimmed, "/admin"):
		userIDRaw := strings.TrimSuffix(trimmed, "/admin")
		userIDRaw = strings.TrimSuffix(userIDRaw, "/")
		userID, err := uuid.Parse(userIDRaw)
		if err != nil {
			return uuid.Nil, "", false
		}
		return userID, "admin", true
	default:
		return uuid.Nil, "", false
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
