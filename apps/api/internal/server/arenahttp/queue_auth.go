package arenahttp

import (
	"net/http"
	"strings"

	"api/internal/model"

	"github.com/google/uuid"
)

func actorFromRequest(r *http.Request, authorizer Authorizer) (*model.User, bool) {
	if r == nil {
		return nil, false
	}
	if authorizer != nil {
		if authorizer.DevBypass() {
			if parsedID, err := uuid.Parse(authorizer.DevUserID()); err == nil {
				return &model.User{ID: parsedID, Status: model.UserStatusActive}, true
			}
		}
		if rawToken := sessionToken(r, authorizer.CookieName()); rawToken != "" {
			if authState, err := authorizer.AuthenticateByToken(r.Context(), rawToken); err == nil && authState != nil && authState.User != nil {
				return authState.User, true
			}
		}
	}

	rawID := strings.TrimSpace(r.Header.Get(GuestIDHeader))
	if rawID == "" {
		return nil, false
	}
	parsedID, err := uuid.Parse(rawID)
	if err != nil {
		return nil, false
	}

	displayName := strings.TrimSpace(r.Header.Get(GuestNameHeader))
	return &model.User{
		ID:        parsedID,
		FirstName: displayName,
		Status:    model.UserStatusGuest,
	}, true
}

func sessionToken(r *http.Request, cookieName string) string {
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
	if err != nil {
		return ""
	}
	return strings.TrimSpace(cookie.Value)
}
