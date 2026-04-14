package arena

import (
	"api/internal/model"
	v1 "api/pkg/api/arena/v1"
	commonv1 "api/pkg/api/common/v1"
)

func mapDifficulty(difficulty model.ArenaDifficulty) commonv1.Difficulty {
	switch difficulty {
	case model.ArenaDifficultyEasy:
		return commonv1.Difficulty_DIFFICULTY_EASY
	case model.ArenaDifficultyMedium:
		return commonv1.Difficulty_DIFFICULTY_MEDIUM
	case model.ArenaDifficultyHard:
		return commonv1.Difficulty_DIFFICULTY_HARD
	default:
		return commonv1.Difficulty_DIFFICULTY_UNSPECIFIED
	}
}

func unmapDifficulty(difficulty commonv1.Difficulty) model.ArenaDifficulty {
	switch difficulty {
	case commonv1.Difficulty_DIFFICULTY_EASY:
		return model.ArenaDifficultyEasy
	case commonv1.Difficulty_DIFFICULTY_MEDIUM:
		return model.ArenaDifficultyMedium
	case commonv1.Difficulty_DIFFICULTY_HARD:
		return model.ArenaDifficultyHard
	default:
		return model.ArenaDifficultyUnknown
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
	case model.ArenaWinnerReasonAntiCheat:
		return v1.WinnerReason_WINNER_REASON_ANTI_CHEAT
	case model.ArenaWinnerReasonOpponentLeft:
		return v1.WinnerReason_WINNER_REASON_OPPONENT_LEFT
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

func mapSubmitFailureKind(kind model.ArenaSubmissionFailureKind) commonv1.SubmitFailureKind {
	switch kind {
	case model.ArenaSubmissionFailureKindCompileError:
		return commonv1.SubmitFailureKind_SUBMIT_FAILURE_KIND_COMPILE_ERROR
	case model.ArenaSubmissionFailureKindRuntimeError:
		return commonv1.SubmitFailureKind_SUBMIT_FAILURE_KIND_RUNTIME_ERROR
	case model.ArenaSubmissionFailureKindWrongAnswer:
		return commonv1.SubmitFailureKind_SUBMIT_FAILURE_KIND_WRONG_ANSWER
	case model.ArenaSubmissionFailureKindTimeout:
		return commonv1.SubmitFailureKind_SUBMIT_FAILURE_KIND_TIMEOUT
	default:
		return commonv1.SubmitFailureKind_SUBMIT_FAILURE_KIND_UNSPECIFIED
	}
}

// mapQueueStatus converts internal match status + match state to the typed queue status enum.
func mapQueueStatus(matchStatus model.ArenaMatchStatus, hasMatch bool) v1.ArenaQueueStatus {
	if hasMatch || matchStatus == model.ArenaMatchStatusActive {
		return v1.ArenaQueueStatus_ARENA_QUEUE_STATUS_MATCHED
	}
	if matchStatus == model.ArenaMatchStatusWaiting {
		return v1.ArenaQueueStatus_ARENA_QUEUE_STATUS_QUEUED
	}
	return v1.ArenaQueueStatus_ARENA_QUEUE_STATUS_IDLE
}

// unmapAntiCheatReason converts the proto enum to the string used by the domain.
func unmapAntiCheatReason(reason v1.AntiCheatEventReason) string {
	switch reason {
	case v1.AntiCheatEventReason_ANTI_CHEAT_EVENT_REASON_TAB_SWITCH:
		return "tab_switch"
	case v1.AntiCheatEventReason_ANTI_CHEAT_EVENT_REASON_COPY_PASTE:
		return "copy_paste"
	case v1.AntiCheatEventReason_ANTI_CHEAT_EVENT_REASON_EXTERNAL_CODE:
		return "external_code"
	case v1.AntiCheatEventReason_ANTI_CHEAT_EVENT_REASON_OTHER:
		return "other"
	default:
		return ""
	}
}
