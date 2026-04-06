package startroomhttp

import (
	"errors"
	"net/http"
	"strings"
	"time"

	appcodeeditor "api/internal/app/codeeditor"
	domain "api/internal/domain/codeeditor"
	realtimeschema "api/internal/realtime/schema"

	"github.com/google/uuid"
)

func handleStartRoom(svc *appcodeeditor.Service, publisher RealtimePublisher, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Authenticate
		callerID, ok := authenticate(r, authorizer)
		if !ok || callerID == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		// Extract room_id from path: /api/v1/code-editor/rooms/{room_id}/start
		roomIDStr := extractPathSegment(r.URL.Path, "rooms", 1)
		if roomIDStr == "" {
			http.Error(w, "missing room_id", http.StatusBadRequest)
			return
		}
		roomID, err := uuid.Parse(roomIDStr)
		if err != nil {
			http.Error(w, "invalid room_id", http.StatusBadRequest)
			return
		}

		room, err := svc.StartRoom(r.Context(), roomID, callerID)
		if err != nil {
			switch {
			case errors.Is(err, domain.ErrForbidden):
				http.Error(w, "forbidden: only the room creator can start the room", http.StatusForbidden)
			case errors.Is(err, domain.ErrRoomNotFound):
				http.Error(w, "room not found", http.StatusNotFound)
			default:
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
			return
		}

		// Broadcast room_update so all connected participants see the status change
		if publisher != nil {
			publisher.PublishRoomUpdate(mapRoom(room))
		}

		writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "roomStatus": room.Status.String()})
	}
}

// mapRoom converts the domain room to the realtime schema for broadcasting.
func mapRoom(room *domain.Room) *realtimeschema.CodeEditorRoom {
	if room == nil {
		return nil
	}
	participants := make([]*realtimeschema.CodeEditorParticipant, 0, len(room.Participants))
	for _, p := range room.Participants {
		if p == nil {
			continue
		}
		id := p.Name
		userID := ""
		if p.UserID != nil {
			id = p.UserID.String()
			userID = p.UserID.String()
		}
		participants = append(participants, &realtimeschema.CodeEditorParticipant{
			ID:          id,
			UserID:      userID,
			DisplayName: p.Name,
			IsGuest:     p.IsGuest,
			IsReady:     p.IsReady,
			JoinedAt:    p.JoinedAt.Format(time.RFC3339),
		})
	}
	maxParticipants := int32(10)
	if room.Mode == domain.RoomModeDuel {
		maxParticipants = 2
	}
	return &realtimeschema.CodeEditorRoom{
		ID:              room.ID.String(),
		Mode:            room.Mode.String(),
		InviteCode:      room.InviteCode,
		CreatorID:       room.CreatorID.String(),
		Code:            room.Code,
		CodeRevision:    room.CodeRevision,
		Status:          room.Status.String(),
		MaxParticipants: maxParticipants,
		Participants:    participants,
		CreatedAt:       room.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       room.UpdatedAt.Format(time.RFC3339),
	}
}

// extractPathSegment finds the segment that comes `offset` positions after `key` in the URL path.
// e.g. for path "/api/v1/code-editor/rooms/abc-123/start" and key="rooms", offset=1 → "abc-123"
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
