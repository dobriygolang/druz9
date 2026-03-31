package server

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"api/internal/model"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
)

const (
	arenaQueueJoinPath      = "/api/v1/arena/queue/join"
	arenaQueueLeavePath     = "/api/v1/arena/queue/leave"
	arenaQueueStatusPath    = "/api/v1/arena/queue/status"
	arenaAntiCheatEventPath = "/api/v1/arena/anti-cheat/event"
	arenaStatsPrefix        = "/api/v1/arena/stats/"
	arenaStatsBatchPath     = "/api/v1/arena/stats/batch"
	arenaGuestIDHeader      = "X-Arena-Guest-Id"
	arenaGuestNameHeader    = "X-Arena-Guest-Name"
)

type arenaQueueService interface {
	EnqueueMatchmaking(ctx context.Context, user *model.User, topic, difficulty string, obfuscateOpponent bool) (*model.ArenaQueueState, error)
	LeaveQueue(ctx context.Context, user *model.User) error
	GetQueueStatus(ctx context.Context, user *model.User) (*model.ArenaQueueState, error)
	GetPlayerStats(ctx context.Context, userID uuid.UUID) (*model.ArenaPlayerStats, error)
	GetPlayerStatsBatch(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*model.ArenaPlayerStats, error)
	ReportPlayerSuspicion(ctx context.Context, matchID uuid.UUID, user *model.User, reason string) error
}

type arenaQueueAuthorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
	DevBypass() bool
	DevUserID() string
}

func RegisterArenaQueue(srv *kratoshttp.Server, service arenaQueueService, authorizer arenaQueueAuthorizer) {
	srv.HandlePrefix(arenaQueueJoinPath, arenaQueueHandler(service, authorizer))
	srv.HandlePrefix(arenaQueueLeavePath, arenaQueueHandler(service, authorizer))
	srv.HandlePrefix(arenaQueueStatusPath, arenaQueueHandler(service, authorizer))
	srv.HandlePrefix(arenaStatsPrefix, arenaQueueHandler(service, authorizer))
	srv.HandlePrefix(arenaStatsBatchPath, arenaQueueHandler(service, authorizer))
	srv.HandlePrefix(arenaAntiCheatEventPath, arenaQueueHandler(service, authorizer))
}

func arenaQueueHandler(service arenaQueueService, authorizer arenaQueueAuthorizer) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc(arenaQueueJoinPath, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		user, ok := arenaActorFromRequest(r, authorizer)
		if !ok {
			writeArenaJSON(w, http.StatusUnauthorized, map[string]any{"message": "arena actor required"})
			return
		}
		var req struct {
			Topic             string          `json:"topic"`
			Difficulty        json.RawMessage `json:"difficulty"`
			ObfuscateOpponent bool            `json:"obfuscateOpponent"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		difficulty := normalizeArenaDifficultyInput(req.Difficulty)

		state, err := service.EnqueueMatchmaking(r.Context(), user, req.Topic, difficulty, req.ObfuscateOpponent)
		if err != nil {
			writeArenaJSON(w, http.StatusBadRequest, map[string]any{"message": err.Error()})
			return
		}
		writeArenaJSON(w, http.StatusOK, arenaQueueStateJSON(state))
	})

	mux.HandleFunc(arenaQueueLeavePath, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		user, ok := arenaActorFromRequest(r, authorizer)
		if !ok {
			writeArenaJSON(w, http.StatusUnauthorized, map[string]any{"message": "arena actor required"})
			return
		}
		if err := service.LeaveQueue(r.Context(), user); err != nil {
			writeArenaJSON(w, http.StatusBadRequest, map[string]any{"message": err.Error()})
			return
		}
		state, err := service.GetQueueStatus(r.Context(), nil)
		if err != nil {
			writeArenaJSON(w, http.StatusOK, map[string]any{"status": "idle"})
			return
		}
		writeArenaJSON(w, http.StatusOK, arenaQueueStateJSON(state))
	})

	mux.HandleFunc(arenaQueueStatusPath, func(w http.ResponseWriter, r *http.Request) {
		user, _ := arenaActorFromRequest(r, authorizer)
		state, err := service.GetQueueStatus(r.Context(), user)
		if err != nil {
			writeArenaJSON(w, http.StatusInternalServerError, map[string]any{"message": err.Error()})
			return
		}
		writeArenaJSON(w, http.StatusOK, arenaQueueStateJSON(state))
	})

	mux.HandleFunc(arenaStatsPrefix, func(w http.ResponseWriter, r *http.Request) {
		userID, ok := parseArenaStatsUserID(r)
		if !ok {
			http.NotFound(w, r)
			return
		}
		stats, err := service.GetPlayerStats(r.Context(), userID)
		if err != nil {
			writeArenaJSON(w, http.StatusInternalServerError, map[string]any{"message": err.Error()})
			return
		}
		writeArenaJSON(w, http.StatusOK, map[string]any{"stats": arenaStatsJSON(stats)})
	})

	mux.HandleFunc(arenaStatsBatchPath, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		var req struct {
			UserIDs []string `json:"userIds"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeArenaJSON(w, http.StatusBadRequest, map[string]any{"message": "invalid request"})
			return
		}
		if len(req.UserIDs) == 0 || len(req.UserIDs) > 100 {
			writeArenaJSON(w, http.StatusBadRequest, map[string]any{"message": "userIds must contain 1-100 items"})
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
			writeArenaJSON(w, http.StatusInternalServerError, map[string]any{"message": err.Error()})
			return
		}

		result := make(map[string]any, len(statsMap))
		for userID, stats := range statsMap {
			result[userID.String()] = arenaStatsJSON(stats)
		}
		writeArenaJSON(w, http.StatusOK, map[string]any{"stats": result})
	})

	mux.HandleFunc(arenaAntiCheatEventPath, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}
		user, ok := arenaActorFromRequest(r, authorizer)
		if !ok {
			writeArenaJSON(w, http.StatusUnauthorized, map[string]any{"message": "arena actor required"})
			return
		}
		var req struct {
			MatchID string `json:"matchId"`
			Reason  string `json:"reason"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)

		matchID, err := uuid.Parse(strings.TrimSpace(req.MatchID))
		if err != nil {
			writeArenaJSON(w, http.StatusBadRequest, map[string]any{"message": "invalid match id"})
			return
		}
		if err := service.ReportPlayerSuspicion(r.Context(), matchID, user, strings.TrimSpace(req.Reason)); err != nil {
			writeArenaJSON(w, http.StatusBadRequest, map[string]any{"message": err.Error()})
			return
		}
		writeArenaJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	})

	return mux
}

func arenaActorFromRequest(r *http.Request, authorizer arenaQueueAuthorizer) (*model.User, bool) {
	if r == nil {
		return nil, false
	}
	if authorizer != nil {
		if authorizer.DevBypass() {
			if parsedID, err := uuid.Parse(authorizer.DevUserID()); err == nil {
				return &model.User{ID: parsedID, Status: model.UserStatusActive}, true
			}
		}
		if rawToken := arenaSessionToken(r, authorizer.CookieName()); rawToken != "" {
			if authState, err := authorizer.AuthenticateByToken(r.Context(), rawToken); err == nil && authState != nil && authState.User != nil {
				return authState.User, true
			}
		}
	}

	rawID := strings.TrimSpace(r.Header.Get(arenaGuestIDHeader))
	if rawID == "" {
		return nil, false
	}
	parsedID, err := uuid.Parse(rawID)
	if err != nil {
		return nil, false
	}
	displayName := strings.TrimSpace(r.Header.Get(arenaGuestNameHeader))
	if displayName == "" {
		displayName = "Игрок"
	}
	return &model.User{
		ID:        parsedID,
		FirstName: displayName,
		Status:    model.UserStatusGuest,
	}, true
}

func arenaSessionToken(r *http.Request, cookieName string) string {
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

func arenaQueueStateJSON(state *model.ArenaQueueState) map[string]any {
	if state == nil {
		return map[string]any{"status": "idle", "queueSize": 0}
	}
	item := map[string]any{
		"status":     arenaQueueStatusValue(state),
		"topic":      state.Topic,
		"difficulty": state.Difficulty.String(),
		"queueSize":  state.QueueSize,
	}
	if state.QueuedAt != nil && !state.QueuedAt.IsZero() {
		item["queuedAt"] = state.QueuedAt.UTC().Format(time.RFC3339Nano)
	}
	if state.Match != nil {
		item["match"] = arenaMatchJSON(state.Match)
	}
	return item
}

func normalizeArenaDifficultyInput(raw json.RawMessage) string {
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

func arenaQueueStatusValue(state *model.ArenaQueueState) string {
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

func arenaStatsJSON(stats *model.ArenaPlayerStats) map[string]any {
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

func parseArenaStatsUserID(r *http.Request) (uuid.UUID, bool) {
	if r == nil || !strings.HasPrefix(r.URL.Path, arenaStatsPrefix) {
		return uuid.Nil, false
	}
	raw := strings.TrimPrefix(r.URL.Path, arenaStatsPrefix)
	if raw == "" || strings.Contains(raw, "/") {
		return uuid.Nil, false
	}
	userID, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, false
	}
	return userID, true
}
