package circleeventhttp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

func handleListCircleEvents(svc EventService, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := authenticate(r, authorizer)
		if !ok || callerID == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		circleID, err := parseCircleID(r.URL.Path)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		resp, err := svc.ListEvents(r.Context(), *callerID, model.ListEventsOptions{
			Limit:    20,
			CircleID: &circleID,
			Status:   r.URL.Query().Get("status"),
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		type eventJSON struct {
			ID               string  `json:"id"`
			Title            string  `json:"title"`
			Description      string  `json:"description"`
			MeetingLink      string  `json:"meetingLink"`
			PlaceLabel       string  `json:"placeLabel"`
			ScheduledAt      string  `json:"scheduledAt"`
			CreatorID        string  `json:"creatorId"`
			CreatorName      string  `json:"creatorName"`
			IsCreator        bool    `json:"isCreator"`
			IsJoined         bool    `json:"isJoined"`
			ParticipantCount int     `json:"participantCount"`
			Repeat           string  `json:"repeat"`
		}

		out := make([]eventJSON, 0, len(resp.Events))
		for _, e := range resp.Events {
			out = append(out, eventJSON{
				ID:               e.ID.String(),
				Title:            e.Title,
				Description:      e.Description,
				MeetingLink:      e.MeetingLink,
				PlaceLabel:       e.PlaceLabel,
				ScheduledAt:      e.ScheduledAt.Format(time.RFC3339),
				CreatorID:        e.CreatorID,
				CreatorName:      e.CreatorName,
				IsCreator:        e.IsCreator,
				IsJoined:         e.IsJoined,
				ParticipantCount: e.ParticipantCount,
				Repeat:           e.Repeat,
			})
		}

		writeJSON(w, http.StatusOK, map[string]any{"events": out})
	}
}

func handleCreateCircleEvent(svc EventService, circleSvc CircleService, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := authenticate(r, authorizer)
		if !ok || callerID == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		circleID, err := parseCircleID(r.URL.Path)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Only circle members can create events for the circle
		isMember, err := circleSvc.IsMember(r.Context(), circleID, *callerID)
		if err != nil || !isMember {
			http.Error(w, "forbidden: must be a circle member", http.StatusForbidden)
			return
		}

		var body struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			MeetingLink string `json:"meetingLink"`
			PlaceLabel  string `json:"placeLabel"`
			ScheduledAt string `json:"scheduledAt"`
			Repeat      string `json:"repeat"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		if body.Title == "" {
			http.Error(w, "title is required", http.StatusBadRequest)
			return
		}

		scheduledAt, err := time.Parse(time.RFC3339, body.ScheduledAt)
		if err != nil {
			http.Error(w, "invalid scheduledAt format, use RFC3339", http.StatusBadRequest)
			return
		}
		if scheduledAt.Before(time.Now()) {
			http.Error(w, "scheduledAt must be in the future", http.StatusBadRequest)
			return
		}

		event, err := svc.CreateEvent(r.Context(), *callerID, model.CreateEventRequest{
			Title:       body.Title,
			Description: body.Description,
			MeetingLink: body.MeetingLink,
			PlaceLabel:  body.PlaceLabel,
			ScheduledAt: scheduledAt,
			Repeat:      body.Repeat,
			CircleID:    &circleID,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusCreated, map[string]any{
			"event": map[string]any{
				"id":               event.ID.String(),
				"title":            event.Title,
				"description":      event.Description,
				"meetingLink":      event.MeetingLink,
				"placeLabel":       event.PlaceLabel,
				"scheduledAt":      event.ScheduledAt.Format(time.RFC3339),
				"creatorId":        event.CreatorID,
				"creatorName":      event.CreatorName,
				"isCreator":        event.IsCreator,
				"isJoined":         event.IsJoined,
				"participantCount": event.ParticipantCount,
				"repeat":           event.Repeat,
			},
		})
	}
}

func parseCircleID(path string) (uuid.UUID, error) {
	seg := extractPathSegment(path, "circles", 1)
	if seg == "" {
		return uuid.Nil, fmt.Errorf("missing circle_id")
	}
	id, err := uuid.Parse(seg)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid circle_id")
	}
	return id, nil
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
