package arena

import (
	"time"

	domain "api/internal/domain/arena"
	realtime "api/internal/realtime/schema"
)

func mapArenaRealtimeMatch(match *domain.Match) *realtime.ArenaMatch {
	if match == nil {
		return nil
	}

	result := &realtime.ArenaMatch{
		ID:                match.ID.String(),
		TaskID:            match.TaskID.String(),
		TaskTitle:         arenaTaskTitle(match),
		TaskStatement:     arenaTaskStatement(match),
		StarterCode:       arenaStarterCode(match),
		Topic:             match.Topic,
		Difficulty:        match.Difficulty.String(),
		Status:            match.Status.String(),
		DurationSeconds:   match.DurationSeconds,
		ObfuscateOpponent: match.ObfuscateOpponent,
		IsRated:           match.IsRated,
		UnratedReason:     match.UnratedReason,
		AntiCheatEnabled:  match.AntiCheatEnabled,
		WinnerReason:      match.WinnerReason.String(),
		Players:           make([]*realtime.ArenaPlayer, 0, len(match.Players)),
	}

	if match.WinnerUserID != nil {
		result.WinnerUserID = match.WinnerUserID.String()
	}
	result.StartedAt = formatArenaTimePtr(match.StartedAt)
	result.FinishedAt = formatArenaTimePtr(match.FinishedAt)
	result.CreatedAt = formatArenaTime(match.CreatedAt)

	for _, player := range match.Players {
		if player == nil {
			continue
		}
		result.Players = append(result.Players, &realtime.ArenaPlayer{
			UserID:             player.UserID.String(),
			DisplayName:        player.DisplayName,
			Side:               player.Side.String(),
			IsCreator:          player.IsCreator,
			CurrentCode:        player.CurrentCode,
			FreezeUntil:        formatArenaTimePtr(player.FreezeUntil),
			AcceptedAt:         formatArenaTimePtr(player.AcceptedAt),
			SuspicionCount:     player.SuspicionCount,
			AntiCheatPenalized: player.AntiCheatPenalized,
			BestRuntimeMs:      player.BestRuntimeMs,
			IsWinner:           player.IsWinner,
			JoinedAt:           formatArenaTime(player.JoinedAt),
		})
	}

	return result
}

func mapArenaRealtimeCodes(match *domain.Match) []*realtime.ArenaPlayerCode {
	if match == nil {
		return nil
	}
	result := make([]*realtime.ArenaPlayerCode, 0, len(match.Players))
	for _, player := range match.Players {
		if player == nil {
			continue
		}
		result = append(result, &realtime.ArenaPlayerCode{
			UserID:      player.UserID.String(),
			DisplayName: player.DisplayName,
			Code:        player.CurrentCode,
		})
	}
	return result
}

func formatArenaTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
}

func formatArenaTimePtr(value *time.Time) string {
	if value == nil {
		return ""
	}
	return formatArenaTime(*value)
}
