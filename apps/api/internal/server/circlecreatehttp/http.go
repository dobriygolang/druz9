package circlecreatehttp

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

func handleCreateCircle(svc CircleService, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		callerID, ok := authenticate(r, authorizer)
		if !ok || callerID == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var body struct {
			Name        string   `json:"name"`
			Description string   `json:"description"`
			Tags        []string `json:"tags"`
			IsPublic    *bool    `json:"isPublic"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		if strings.TrimSpace(body.Name) == "" {
			http.Error(w, "name is required", http.StatusBadRequest)
			return
		}

		// Default to public if not specified
		isPublic := true
		if body.IsPublic != nil {
			isPublic = *body.IsPublic
		}

		circle, err := svc.CreateCircle(r.Context(), *callerID, body.Name, body.Description, body.Tags, isPublic)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"circle": map[string]any{
				"id":          circle.ID.String(),
				"name":        circle.Name,
				"description": circle.Description,
				"creatorId":   circle.CreatorID.String(),
				"memberCount": circle.MemberCount,
				"tags":        circle.Tags,
				"isPublic":    circle.IsPublic,
				"isJoined":    circle.IsJoined,
				"createdAt":   circle.CreatedAt,
			},
		})
	}
}

func handleInviteToCircle(svc CircleService, authorizer Authorizer) http.HandlerFunc {
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

		var body struct {
			UserID string `json:"userId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		inviteeID, err := uuid.Parse(strings.TrimSpace(body.UserID))
		if err != nil {
			http.Error(w, "invalid userId", http.StatusBadRequest)
			return
		}

		if err := svc.InviteToCircle(r.Context(), circleID, *callerID, inviteeID); err != nil {
			status := http.StatusInternalServerError
			if err.Error() == "forbidden" || strings.Contains(err.Error(), "only creator") {
				status = http.StatusForbidden
			}
			http.Error(w, err.Error(), status)
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"status": "invited"})
	}
}

func parseCircleID(path string) (uuid.UUID, error) {
	seg := extractPathSegment(path, "circles", 1)
	if seg == "" {
		return uuid.Nil, nil
	}
	id, err := uuid.Parse(seg)
	if err != nil {
		return uuid.Nil, err
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
