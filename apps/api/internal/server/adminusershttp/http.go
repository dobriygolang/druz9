package adminusershttp

import (
	"encoding/json"
	"errors"
	"net/http"

	profileerrors "api/internal/errors/profile"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

func handleUsers(field string, repo Repo, authorizer Authorizer, cacheInvalidator CacheInvalidator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !isAdmin(r, authorizer) {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		userIDRaw := mux.Vars(r)["user_id"]
		userID, err := uuid.Parse(userIDRaw)
		if err != nil {
			http.Error(w, "bad user id", http.StatusBadRequest)
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

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
