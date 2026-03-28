package server

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"api/internal/model"

	kratoshttp "github.com/go-kratos/kratos/v2/transport/http"
)

const arenaOpenMatchesPath = "/api/v1/arena/open-matches"

func RegisterArenaOpenMatches(srv *kratoshttp.Server, service interface {
	ListOpenMatches(ctx context.Context, limit int32) ([]*model.ArenaMatch, error)
}) {
	srv.HandlePrefix(arenaOpenMatchesPath, arenaOpenMatchesHandler(service))
}

func arenaOpenMatchesHandler(service interface {
	ListOpenMatches(ctx context.Context, limit int32) ([]*model.ArenaMatch, error)
}) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		limit := int32(8)
		if raw := r.URL.Query().Get("limit"); raw != "" {
			if parsed, err := strconv.Atoi(raw); err == nil {
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
			writeArenaJSON(w, http.StatusInternalServerError, map[string]any{
				"message": "failed to list open matches",
			})
			return
		}

		payload := make([]map[string]any, 0, len(matches))
		for _, match := range matches {
			if match == nil {
				continue
			}
			payload = append(payload, arenaMatchJSON(match))
		}

		writeArenaJSON(w, http.StatusOK, map[string]any{
			"matches": payload,
		})
	})
}

func writeArenaJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func arenaMatchJSON(match *model.ArenaMatch) map[string]any {
	item := map[string]any{
		"id":                match.ID.String(),
		"taskId":            match.TaskID.String(),
		"taskTitle":         arenaTaskTitleValue(match),
		"taskStatement":     arenaTaskStatementValue(match),
		"starterCode":       arenaStarterCodeValue(match),
		"topic":             match.Topic,
		"difficulty":        match.Difficulty,
		"status":            match.Status,
		"durationSeconds":   match.DurationSeconds,
		"obfuscateOpponent": match.ObfuscateOpponent,
		"winnerReason":      match.WinnerReason,
		"createdAt":         match.CreatedAt.UTC().Format(time.RFC3339Nano),
		"players":           make([]map[string]any, 0, len(match.Players)),
	}
	if match.WinnerUserID != nil {
		item["winnerUserId"] = match.WinnerUserID.String()
	}
	if match.StartedAt != nil && !match.StartedAt.IsZero() {
		item["startedAt"] = match.StartedAt.UTC().Format(time.RFC3339Nano)
	}
	if match.FinishedAt != nil && !match.FinishedAt.IsZero() {
		item["finishedAt"] = match.FinishedAt.UTC().Format(time.RFC3339Nano)
	}
	players := item["players"].([]map[string]any)
	for _, player := range match.Players {
		if player == nil {
			continue
		}
		playerItem := map[string]any{
			"userId":        player.UserID.String(),
			"displayName":   player.DisplayName,
			"side":          player.Side,
			"isCreator":     player.IsCreator,
			"currentCode":   player.CurrentCode,
			"bestRuntimeMs": player.BestRuntimeMs,
			"isWinner":      player.IsWinner,
			"joinedAt":      player.JoinedAt.UTC().Format(time.RFC3339Nano),
		}
		if player.FreezeUntil != nil && !player.FreezeUntil.IsZero() {
			playerItem["freezeUntil"] = player.FreezeUntil.UTC().Format(time.RFC3339Nano)
		}
		if player.AcceptedAt != nil && !player.AcceptedAt.IsZero() {
			playerItem["acceptedAt"] = player.AcceptedAt.UTC().Format(time.RFC3339Nano)
		}
		players = append(players, playerItem)
	}
	item["players"] = players
	return item
}

func arenaTaskTitleValue(match *model.ArenaMatch) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.Title
}

func arenaTaskStatementValue(match *model.ArenaMatch) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.Statement
}

func arenaStarterCodeValue(match *model.ArenaMatch) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.StarterCode
}
