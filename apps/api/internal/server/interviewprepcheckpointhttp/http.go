package interviewprepcheckpointhttp

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	appinterviewprep "api/internal/app/interviewprep"
	"api/internal/model"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type startCheckpointRequest struct {
	TaskID string `json:"task_id"`
}

func handleStartCheckpoint(service *appinterviewprep.Service, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if service == nil || authorizer == nil {
			http.Error(w, "service unavailable", http.StatusServiceUnavailable)
			return
		}

		user, ok := authenticate(r, authorizer)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req startCheckpointRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		taskID, err := uuid.Parse(strings.TrimSpace(req.TaskID))
		if err != nil {
			http.Error(w, "bad task id", http.StatusBadRequest)
			return
		}

		session, checkpoint, err := service.StartCheckpointSession(r.Context(), user, taskID)
		if err != nil {
			writeServiceError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"session":    session,
			"checkpoint": checkpoint,
		})
	}
}

func handleGetCheckpoint(service *appinterviewprep.Service, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if service == nil || authorizer == nil {
			http.Error(w, "service unavailable", http.StatusServiceUnavailable)
			return
		}

		user, ok := authenticate(r, authorizer)
		if !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		sessionID, err := uuid.Parse(strings.TrimSpace(mux.Vars(r)["session_id"]))
		if err != nil {
			http.Error(w, "bad session id", http.StatusBadRequest)
			return
		}

		checkpoint, err := service.GetCheckpointBySession(r.Context(), user, sessionID)
		if err != nil {
			writeServiceError(w, err)
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"checkpoint": checkpoint})
	}
}

func authenticate(r *http.Request, authorizer Authorizer) (*model.User, bool) {
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
	return authState.User, true
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

func writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, appinterviewprep.ErrTaskNotFound), errors.Is(err, appinterviewprep.ErrCheckpointNotFound):
		http.Error(w, err.Error(), http.StatusNotFound)
	case errors.Is(err, appinterviewprep.ErrCheckpointUnsupported):
		http.Error(w, err.Error(), http.StatusBadRequest)
	case errors.Is(err, appinterviewprep.ErrCheckpointExpired), errors.Is(err, appinterviewprep.ErrCheckpointAttemptsExceeded):
		http.Error(w, err.Error(), http.StatusConflict)
	default:
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
