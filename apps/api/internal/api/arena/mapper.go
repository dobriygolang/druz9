package arena

import (
	"time"

	domain "api/internal/domain/arena"
	"api/internal/model"
	realtime "api/internal/realtime/schema"
	v1 "api/pkg/api/arena/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapDifficulty(difficulty model.ArenaDifficulty) v1.Difficulty {
	switch difficulty {
	case model.ArenaDifficultyEasy:
		return v1.Difficulty_DIFFICULTY_EASY
	case model.ArenaDifficultyMedium:
		return v1.Difficulty_DIFFICULTY_MEDIUM
	case model.ArenaDifficultyHard:
		return v1.Difficulty_DIFFICULTY_HARD
	default:
		return v1.Difficulty_DIFFICULTY_UNSPECIFIED
	}
}

func unmapDifficulty(difficulty v1.Difficulty) model.ArenaDifficulty {
	switch difficulty {
	case v1.Difficulty_DIFFICULTY_EASY:
		return model.ArenaDifficultyEasy
	case v1.Difficulty_DIFFICULTY_MEDIUM:
		return model.ArenaDifficultyMedium
	case v1.Difficulty_DIFFICULTY_HARD:
		return model.ArenaDifficultyHard
	default:
		return model.ArenaDifficultyEasy
	}
}

func mapWinnerReason(reason model.ArenaWinnerReason) v1.WinnerReason {
	switch reason {
	case model.ArenaWinnerReasonAcceptedTime:
		return v1.WinnerReason_WINNER_REASON_ACCEPTED_TIME
	case model.ArenaWinnerReasonRuntime:
		return v1.WinnerReason_WINNER_REASON_RUNTIME
	case model.ArenaWinnerReasonTimeout:
		return v1.WinnerReason_WINNER_REASON_TIMEOUT
	case model.ArenaWinnerReasonSingleAC:
		return v1.WinnerReason_WINNER_REASON_SINGLE_AC
	case model.ArenaWinnerReasonNone:
		return v1.WinnerReason_WINNER_REASON_NONE
	default:
		return v1.WinnerReason_WINNER_REASON_UNSPECIFIED
	}
}

func mapPlayerSide(side model.ArenaPlayerSide) v1.ArenaPlayerSide {
	switch side {
	case model.ArenaPlayerSideLeft:
		return v1.ArenaPlayerSide_ARENA_PLAYER_SIDE_LEFT
	case model.ArenaPlayerSideRight:
		return v1.ArenaPlayerSide_ARENA_PLAYER_SIDE_RIGHT
	default:
		return v1.ArenaPlayerSide_ARENA_PLAYER_SIDE_UNSPECIFIED
	}
}

func mapArenaLeague(league model.ArenaLeague) v1.ArenaLeague {
	switch league {
	case model.ArenaLeagueBronze:
		return v1.ArenaLeague_ARENA_LEAGUE_BRONZE
	case model.ArenaLeagueSilver:
		return v1.ArenaLeague_ARENA_LEAGUE_SILVER
	case model.ArenaLeagueGold:
		return v1.ArenaLeague_ARENA_LEAGUE_GOLD
	case model.ArenaLeaguePlatinum:
		return v1.ArenaLeague_ARENA_LEAGUE_PLATINUM
	case model.ArenaLeagueDiamond:
		return v1.ArenaLeague_ARENA_LEAGUE_DIAMOND
	case model.ArenaLeagueMaster:
		return v1.ArenaLeague_ARENA_LEAGUE_MASTER
	case model.ArenaLeagueLegend:
		return v1.ArenaLeague_ARENA_LEAGUE_LEGEND
	default:
		return v1.ArenaLeague_ARENA_LEAGUE_UNSPECIFIED
	}
}

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
		Difficulty:        mapDifficulty(match.Difficulty),
		Status:            mapArenaStatus(match.Status),
		DurationSeconds:   match.DurationSeconds,
		ObfuscateOpponent: match.ObfuscateOpponent,
		IsRated:           match.IsRated,
		UnratedReason:     match.UnratedReason,
		AntiCheatEnabled:  match.AntiCheatEnabled,
		WinnerReason:      mapWinnerReason(match.WinnerReason),
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
		Side:          mapPlayerSide(player.Side),
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

func mapArenaStatus(status model.ArenaMatchStatus) v1.ArenaMatchStatus {
	switch status {
	case model.ArenaMatchStatusWaiting:
		return v1.ArenaMatchStatus_ARENA_MATCH_STATUS_WAITING
	case model.ArenaMatchStatusActive:
		return v1.ArenaMatchStatus_ARENA_MATCH_STATUS_ACTIVE
	case model.ArenaMatchStatusFinished:
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
			League:      mapArenaLeague(entry.League),
			Wins:        entry.Wins,
			Losses:      entry.Losses,
			Matches:     entry.Matches,
			WinRate:     entry.WinRate,
			BestRuntime: entry.BestRuntime,
		})
	}
	return result
}

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
			UserID:        player.UserID.String(),
			DisplayName:   player.DisplayName,
			Side:          player.Side.String(),
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
