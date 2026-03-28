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
	WinnerReasonNone         = model.ArenaWinnerReasonNone
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
