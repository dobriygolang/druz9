package arena

import (
	"time"

	domain "api/internal/domain/arena"
	"api/internal/dto"
	v1 "api/pkg/api/arena/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapArenaMatch(match *domain.Match) *v1.ArenaMatch {
	if match == nil {
		return nil
	}

	result := &v1.ArenaMatch{
		Id:                match.ID.String(),
		TaskId:            match.TaskID.String(),
		TaskTitle:         arenaTaskTitle(match),
		TaskStatement:     arenaTaskStatement(match),
		StarterCode:       arenaStarterCode(match),
		Topic:             match.Topic,
		Difficulty:        match.Difficulty,
		Status:            mapArenaStatus(match.Status),
		DurationSeconds:   match.DurationSeconds,
		ObfuscateOpponent: match.ObfuscateOpponent,
		IsRated:           match.IsRated,
		UnratedReason:     match.UnratedReason,
		AntiCheatEnabled:  match.AntiCheatEnabled,
		WinnerReason:      match.WinnerReason,
		Players:           make([]*v1.ArenaPlayer, 0, len(match.Players)),
	}

	if match.WinnerUserID != nil {
		result.WinnerUserId = match.WinnerUserID.String()
	}
	if match.StartedAt != nil && !match.StartedAt.IsZero() {
		result.StartedAt = timestamppb.New(*match.StartedAt)
	}
	if match.FinishedAt != nil && !match.FinishedAt.IsZero() {
		result.FinishedAt = timestamppb.New(*match.FinishedAt)
	}
	if !match.CreatedAt.IsZero() {
		result.CreatedAt = timestamppb.New(match.CreatedAt)
	}

	for _, player := range match.Players {
		if player == nil {
			continue
		}
		result.Players = append(result.Players, mapArenaPlayer(player))
	}

	return result
}

func mapArenaPlayer(player *domain.Player) *v1.ArenaPlayer {
	if player == nil {
		return nil
	}
	result := &v1.ArenaPlayer{
		UserId:        player.UserID.String(),
		DisplayName:   player.DisplayName,
		Side:          player.Side,
		IsCreator:     player.IsCreator,
		BestRuntimeMs: player.BestRuntimeMs,
		IsWinner:      player.IsWinner,
		CurrentCode:   player.CurrentCode,
	}
	if player.FreezeUntil != nil && !player.FreezeUntil.IsZero() {
		result.FreezeUntil = timestamppb.New(*player.FreezeUntil)
	}
	if player.AcceptedAt != nil && !player.AcceptedAt.IsZero() {
		result.AcceptedAt = timestamppb.New(*player.AcceptedAt)
	}
	if !player.JoinedAt.IsZero() {
		result.JoinedAt = timestamppb.New(player.JoinedAt)
	}
	return result
}

func mapArenaStatus(status string) v1.ArenaMatchStatus {
	switch status {
	case domain.MatchStatusWaiting:
		return v1.ArenaMatchStatus_ARENA_MATCH_STATUS_WAITING
	case domain.MatchStatusActive:
		return v1.ArenaMatchStatus_ARENA_MATCH_STATUS_ACTIVE
	case domain.MatchStatusFinished:
		return v1.ArenaMatchStatus_ARENA_MATCH_STATUS_FINISHED
	default:
		return v1.ArenaMatchStatus_ARENA_MATCH_STATUS_UNSPECIFIED
	}
}

func mapArenaLeaderboard(entries []*domain.LeaderboardEntry) []*v1.ArenaLeaderboardEntry {
	result := make([]*v1.ArenaLeaderboardEntry, 0, len(entries))
	for _, entry := range entries {
		if entry == nil {
			continue
		}
		result = append(result, &v1.ArenaLeaderboardEntry{
			UserId:      entry.UserID,
			DisplayName: entry.DisplayName,
			Rating:      entry.Rating,
			League:      entry.League,
			Wins:        entry.Wins,
			Losses:      entry.Losses,
			Matches:     entry.Matches,
			WinRate:     entry.WinRate,
			BestRuntime: entry.BestRuntime,
		})
	}
	return result
}

func mapArenaRealtimeMatch(match *domain.Match) *dto.ArenaRealtimeMatch {
	if match == nil {
		return nil
	}

	result := &dto.ArenaRealtimeMatch{
		ID:                match.ID.String(),
		TaskID:            match.TaskID.String(),
		TaskTitle:         arenaTaskTitle(match),
		TaskStatement:     arenaTaskStatement(match),
		StarterCode:       arenaStarterCode(match),
		Topic:             match.Topic,
		Difficulty:        match.Difficulty,
		Status:            match.Status,
		DurationSeconds:   match.DurationSeconds,
		ObfuscateOpponent: match.ObfuscateOpponent,
		IsRated:           match.IsRated,
		UnratedReason:     match.UnratedReason,
		AntiCheatEnabled:  match.AntiCheatEnabled,
		WinnerReason:      match.WinnerReason,
		Players:           make([]*dto.ArenaRealtimePlayer, 0, len(match.Players)),
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
		result.Players = append(result.Players, &dto.ArenaRealtimePlayer{
			UserID:        player.UserID.String(),
			DisplayName:   player.DisplayName,
			Side:          player.Side,
			IsCreator:     player.IsCreator,
			FreezeUntil:   formatArenaTimePtr(player.FreezeUntil),
			AcceptedAt:    formatArenaTimePtr(player.AcceptedAt),
			BestRuntimeMs: player.BestRuntimeMs,
			IsWinner:      player.IsWinner,
			JoinedAt:      formatArenaTime(player.JoinedAt),
		})
	}

	return result
}

func arenaTaskTitle(match *domain.Match) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.Title
}

func arenaTaskStatement(match *domain.Match) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.Statement
}

func arenaStarterCode(match *domain.Match) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.StarterCode
}

func mapArenaRealtimeCodes(match *domain.Match) []*dto.ArenaRealtimeCode {
	if match == nil {
		return nil
	}
	result := make([]*dto.ArenaRealtimeCode, 0, len(match.Players))
	for _, player := range match.Players {
		if player == nil {
			continue
		}
		result = append(result, &dto.ArenaRealtimeCode{
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
