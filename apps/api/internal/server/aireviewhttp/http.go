package aireviewhttp

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"api/internal/aireview"

	"github.com/google/uuid"
)

const maxCodeLength = 10000

type reviewRequest struct {
	Language  string `json:"language"`
	Code      string `json:"code"`
	TaskTitle string `json:"task_title"`
	Statement string `json:"statement"`
}

func handleAIReview(reviewer aireview.Reviewer, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if reviewer == nil || authorizer == nil {
			http.Error(w, "service unavailable", http.StatusServiceUnavailable)
			return
		}

		if _, ok := authenticate(r, authorizer); !ok {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req reviewRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		if len(req.Code) > maxCodeLength {
			http.Error(w, "code too long", http.StatusBadRequest)
			return
		}

		review, err := reviewer.ReviewInterviewSolution(r.Context(), aireview.InterviewSolutionReviewRequest{
			CandidateLanguage: req.Language,
			CandidateCode:     req.Code,
			TaskTitle:         req.TaskTitle,
			Statement:         req.Statement,
		})
		if err != nil {
			if errors.Is(err, aireview.ErrNotConfigured) {
				http.Error(w, "ai review not configured", http.StatusServiceUnavailable)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"review": review})
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
