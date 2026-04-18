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
)

type (
	Match            = model.ArenaMatch
	Player           = model.ArenaPlayer
	Submission       = model.ArenaSubmission
	LeaderboardEntry = model.ArenaLeaderboardEntry
	QueueEntry       = model.ArenaQueueEntry
	QueueState       = model.ArenaQueueState
	PlayerStats      = model.ArenaPlayerStats
	Task             = model.CodeTask
	TestCase         = model.CodeTestCase
	User             = model.User
	RatingPenalty    = model.ArenaRatingPenalty
)
