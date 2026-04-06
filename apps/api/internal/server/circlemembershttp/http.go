package circlemembershttp

import (
	"net/http"
	"strings"

	"github.com/google/uuid"
)

func handleListCircleMembers(svc CircleService, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Authenticate
		callerID, ok := authenticate(r, authorizer)
		if !ok || callerID == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Extract circle_id from path: /api/v1/circles/{circle_id}/members
		circleIDStr := extractPathSegment(r.URL.Path, "circles", 1)
		if circleIDStr == "" {
			http.Error(w, "missing circle_id", http.StatusBadRequest)
			return
		}
		circleID, err := uuid.Parse(circleIDStr)
		if err != nil {
			http.Error(w, "invalid circle_id", http.StatusBadRequest)
			return
		}

		members, err := svc.ListCircleMembers(r.Context(), circleID, 100)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		type memberJSON struct {
			UserID    string `json:"userId"`
			FirstName string `json:"firstName"`
			LastName  string `json:"lastName"`
			AvatarURL string `json:"avatarUrl"`
			Role      string `json:"role"`
			JoinedAt  string `json:"joinedAt"`
		}

		out := make([]memberJSON, 0, len(members))
		for _, m := range members {
			out = append(out, memberJSON{
				UserID:    m.UserID.String(),
				FirstName: m.FirstName,
				LastName:  m.LastName,
				AvatarURL: m.AvatarURL,
				Role:      m.Role,
				JoinedAt:  m.JoinedAt.Format("2006-01-02T15:04:05Z07:00"),
			})
		}

		writeJSON(w, http.StatusOK, map[string]any{"members": out})
	}
}

func extractPathSegment(path, key string, offset int) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for i, p := range parts {
		if p == key && i+offset < len(parts) {
			return parts[i+offset]
		}
	}
	return ""
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
