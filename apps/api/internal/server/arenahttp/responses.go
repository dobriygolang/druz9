package arenahttp

import (
	"encoding/json"
	"net/http"
	"time"

	"api/internal/model"
)

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func matchJSON(match *model.ArenaMatch) map[string]any {
	item := map[string]any{
		"id":                match.ID.String(),
		"taskId":            match.TaskID.String(),
		"taskTitle":         taskTitleValue(match),
		"taskStatement":     taskStatementValue(match),
		"starterCode":       starterCodeValue(match),
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

func taskTitleValue(match *model.ArenaMatch) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.Title
}

func taskStatementValue(match *model.ArenaMatch) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.Statement
}

func starterCodeValue(match *model.ArenaMatch) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.StarterCode
}
