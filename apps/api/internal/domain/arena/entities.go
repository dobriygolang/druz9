package arena

import "api/internal/model"

const (
	MatchStatusWaiting  = model.ArenaMatchStatusWaiting
	MatchStatusActive   = model.ArenaMatchStatusActive
	MatchStatusFinished = model.ArenaMatchStatusFinished

	MatchSourceInvite      = model.ArenaMatchSourceInvite
	MatchSourceMatchmaking = model.ArenaMatchSourceMatchmaking

	PlayerSideLeft  = model.ArenaPlayerSideLeft
	PlayerSideRight = model.ArenaPlayerSideRight

	WinnerReasonAcceptedTime = model.ArenaWinnerReasonAcceptedTime
	WinnerReasonRuntime      = model.ArenaWinnerReasonRuntime
	WinnerReasonTimeout      = model.ArenaWinnerReasonTimeout
	WinnerReasonSingleAC     = model.ArenaWinnerReasonSingleAC
	WinnerReasonAntiCheat    = model.ArenaWinnerReasonAntiCheat
	WinnerReasonOpponentLeft = model.ArenaWinnerReasonOpponentLeft
	WinnerReasonNone         = model.ArenaWinnerReasonNone

	SubmissionFailureKindCompileError = model.ArenaSubmissionFailureKindCompileError
	SubmissionFailureKindRuntimeError = model.ArenaSubmissionFailureKindRuntimeError
	SubmissionFailureKindWrongAnswer  = model.ArenaSubmissionFailureKindWrongAnswer

	ArenaDifficultyEasy   = model.ArenaDifficultyEasy
	ArenaDifficultyMedium = model.ArenaDifficultyMedium
	ArenaDifficultyHard   = model.ArenaDifficultyHard

	ArenaLeagueBronze   = model.ArenaLeagueBronze
	ArenaLeagueSilver   = model.ArenaLeagueSilver
	ArenaLeagueGold     = model.ArenaLeagueGold
	ArenaLeaguePlatinum = model.ArenaLeaguePlatinum
	ArenaLeagueDiamond  = model.ArenaLeagueDiamond
	ArenaLeagueMaster   = model.ArenaLeagueMaster
	ArenaLeagueLegend   = model.ArenaLeagueLegend
)

type Match = model.ArenaMatch
type Player = model.ArenaPlayer
type Submission = model.ArenaSubmission
type LeaderboardEntry = model.ArenaLeaderboardEntry
type QueueEntry = model.ArenaQueueEntry
type QueueState = model.ArenaQueueState
type PlayerStats = model.ArenaPlayerStats
type Task = model.CodeTask
type TestCase = model.CodeTestCase
type User = model.User
type RatingPenalty = model.ArenaRatingPenalty
