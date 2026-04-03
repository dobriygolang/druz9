package arenahttp

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

func handleQueueJoin(service QueueService, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		user, ok := actorFromRequest(r, authorizer)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"message": "arena actor required"})
			return
		}

		var req struct {
			Topic             string          `json:"topic"`
			Difficulty        json.RawMessage `json:"difficulty"`
			ObfuscateOpponent bool            `json:"obfuscateOpponent"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		state, err := service.EnqueueMatchmaking(
			r.Context(),
			user,
			req.Topic,
			normalizeDifficultyInput(req.Difficulty),
			req.ObfuscateOpponent,
		)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, queueStateJSON(state))
	}
}

func handleQueueLeave(service QueueService, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		user, ok := actorFromRequest(r, authorizer)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"message": "arena actor required"})
			return
		}
		if err := service.LeaveQueue(r.Context(), user); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"message": err.Error()})
			return
		}

		state, err := service.GetQueueStatus(r.Context(), nil)
		if err != nil {
			writeJSON(w, http.StatusOK, map[string]any{"status": "idle"})
			return
		}
		writeJSON(w, http.StatusOK, queueStateJSON(state))
	}
}

func handleQueueStatus(service QueueService, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, _ := actorFromRequest(r, authorizer)
		state, err := service.GetQueueStatus(r.Context(), user)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, queueStateJSON(state))
	}
}

func handleStats(service QueueService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := parseStatsUserID(r)
		if !ok {
			http.NotFound(w, r)
			return
		}

		stats, err := service.GetPlayerStats(r.Context(), userID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"stats": statsJSON(stats)})
	}
}

func handleStatsBatch(service QueueService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}

		var req struct {
			UserIDs []string `json:"userIds"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"message": "invalid request"})
			return
		}
		if len(req.UserIDs) == 0 || len(req.UserIDs) > 100 {
			writeJSON(w, http.StatusBadRequest, map[string]any{"message": "userIds must contain 1-100 items"})
			return
		}

		userIDs := make([]uuid.UUID, 0, len(req.UserIDs))
		for _, idStr := range req.UserIDs {
			if parsedID, err := uuid.Parse(strings.TrimSpace(idStr)); err == nil {
				userIDs = append(userIDs, parsedID)
			}
		}

		statsMap, err := service.GetPlayerStatsBatch(r.Context(), userIDs)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]any{"message": err.Error()})
			return
		}

		result := make(map[string]any, len(statsMap))
		for userID, stats := range statsMap {
			result[userID.String()] = statsJSON(stats)
		}
		writeJSON(w, http.StatusOK, map[string]any{"stats": result})
	}
}

func handleAntiCheatEvent(service QueueService, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		user, ok := actorFromRequest(r, authorizer)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"message": "arena actor required"})
			return
		}

		var req struct {
			MatchID string `json:"matchId"`
			Reason  string `json:"reason"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		matchID, err := uuid.Parse(strings.TrimSpace(req.MatchID))
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"message": "invalid match id"})
			return
		}
		if err := service.ReportPlayerSuspicion(r.Context(), matchID, user, strings.TrimSpace(req.Reason)); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"message": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	}
}

func handleOpenMatches(w http.ResponseWriter, r *http.Request, service OpenMatchesService) {
	limit := int32(8)
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 32); err == nil {
			switch {
			case parsed < 1:
				limit = 1
			case parsed > 20:
				limit = 20
			default:
				limit = int32(parsed)
			}
		}
	}

	matches, err := service.ListOpenMatches(r.Context(), limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "failed to list open matches"})
		return
	}

	payload := make([]map[string]any, 0, len(matches))
	for _, match := range matches {
		if match == nil {
			continue
		}
		payload = append(payload, matchJSON(match))
	}

	writeJSON(w, http.StatusOK, map[string]any{"matches": payload})
}

func queueStateJSON(state *model.ArenaQueueState) map[string]any {
	if state == nil {
		return map[string]any{"status": "idle", "queueSize": 0}
	}
	item := map[string]any{
		"status":     queueStatusValue(state),
		"topic":      state.Topic,
		"difficulty": state.Difficulty.String(),
		"queueSize":  state.QueueSize,
	}
	if state.QueuedAt != nil && !state.QueuedAt.IsZero() {
		item["queuedAt"] = state.QueuedAt.UTC().Format(time.RFC3339Nano)
	}
	if state.Match != nil {
		item["match"] = matchJSON(state.Match)
	}
	return item
}

func normalizeDifficultyInput(raw json.RawMessage) string {
	value := strings.TrimSpace(string(raw))
	value = strings.Trim(value, `"`)
	easy := model.ArenaDifficultyEasy.String()
	medium := model.ArenaDifficultyMedium.String()
	hard := model.ArenaDifficultyHard.String()
	switch value {
	case "", "0", "DIFFICULTY_UNSPECIFIED":
		return ""
	case "1", "DIFFICULTY_EASY", easy:
		return easy
	case "2", "DIFFICULTY_MEDIUM", medium:
		return medium
	case "3", "DIFFICULTY_HARD", hard:
		return hard
	default:
		if parsed, err := strconv.Atoi(value); err == nil {
			switch parsed {
			case 1:
				return easy
			case 2:
				return medium
			case 3:
				return hard
			default:
				return ""
			}
		}
		return value
	}
}

func queueStatusValue(state *model.ArenaQueueState) string {
	if state == nil {
		return "idle"
	}
	if state.Match != nil || state.Status == model.ArenaMatchStatusActive {
		return "matched"
	}
	if state.Status == model.ArenaMatchStatusWaiting {
		return "queued"
	}
	return "idle"
}

func statsJSON(stats *model.ArenaPlayerStats) map[string]any {
	if stats == nil {
		return map[string]any{}
	}
	return map[string]any{
		"userId":      stats.UserID,
		"displayName": stats.DisplayName,
		"rating":      stats.Rating,
		"league":      stats.League,
		"wins":        stats.Wins,
		"losses":      stats.Losses,
		"matches":     stats.Matches,
		"winRate":     stats.WinRate,
		"bestRuntime": stats.BestRuntime,
	}
}

func parseStatsUserID(r *http.Request) (uuid.UUID, bool) {
	if r == nil {
		return uuid.Nil, false
	}
	raw := mux.Vars(r)["user_id"]
	if raw == "" || strings.Contains(raw, "/") {
		return uuid.Nil, false
	}
	userID, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, false
	}
	return userID, true
}

func parseRealtimeMatchID(r *http.Request) (string, bool) {
	if !strings.HasPrefix(r.URL.Path, RealtimePrefix) {
		return "", false
	}
	matchID := strings.TrimPrefix(r.URL.Path, RealtimePrefix)
	if matchID == "" || strings.Contains(matchID, "/") {
		return "", false
	}
	return matchID, true
}
