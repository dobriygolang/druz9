package arena

import (
	domain "api/internal/domain/arena"
	"api/internal/model"
	v1 "api/pkg/api/arena/v1"

	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapArenaMatch(match *domain.Match) *v1.ArenaMatch {
	return mapArenaMatchForViewer(match, "", true)
}

func mapArenaMatchForViewer(match *domain.Match, viewerUserID string, spectator bool) *v1.ArenaMatch {
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
		result.Players = append(result.Players, mapArenaPlayerForViewer(match, player, viewerUserID, spectator))
	}

	return result
}

func mapArenaPlayer(player *domain.Player) *v1.ArenaPlayer {
	return mapArenaPlayerForViewer(nil, player, "", true)
}

func mapArenaPlayerForViewer(match *domain.Match, player *domain.Player, viewerUserID string, spectator bool) *v1.ArenaPlayer {
	if player == nil {
		return nil
	}

	result := &v1.ArenaPlayer{
		UserId:             player.UserID.String(),
		DisplayName:        player.DisplayName,
		Side:               mapPlayerSide(player.Side),
		IsCreator:          player.IsCreator,
		BestRuntimeMs:      player.BestRuntimeMs,
		IsWinner:           player.IsWinner,
		CurrentCode:        arenaVisiblePlayerCode(match, player, viewerUserID, spectator),
		SuspicionCount:     player.SuspicionCount,
		AntiCheatPenalized: player.AntiCheatPenalized,
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

func arenaVisiblePlayerCode(match *domain.Match, player *domain.Player, viewerUserID string, spectator bool) string {
	if player == nil {
		return ""
	}

	if match != nil && match.Status == model.ArenaMatchStatusFinished {
		return player.CurrentCode
	}

	if viewerUserID != "" && player.UserID.String() == viewerUserID {
		return player.CurrentCode
	}

	if spectator {
		return ""
	}

	return ""
}

func arenaViewerState(match *domain.Match, actor *model.User) (string, bool) {
	if actor == nil {
		return "", true
	}

	viewerUserID := actor.ID.String()
	return viewerUserID, !arenaViewerParticipates(match, actor.ID)
}

func arenaViewerParticipates(match *domain.Match, userID uuid.UUID) bool {
	if match == nil || userID == uuid.Nil {
		return false
	}
	for _, player := range match.Players {
		if player != nil && player.UserID == userID {
			return true
		}
	}
	return false
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
