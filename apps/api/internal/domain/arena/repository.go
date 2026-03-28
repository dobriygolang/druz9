package arena

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Repository interface {
	PickRandomTask(ctx context.Context, topic, difficulty string) (*Task, error)
	GetTask(ctx context.Context, taskID uuid.UUID) (*Task, error)
	CreateMatch(ctx context.Context, match *Match, creator *Player, starterCode string) (*Match, error)
	GetMatch(ctx context.Context, matchID uuid.UUID) (*Match, error)
	ListOpenMatchIDs(ctx context.Context, limit int32) ([]uuid.UUID, error)
	CleanupInactiveMatches(ctx context.Context, idleFor time.Duration) (int64, error)
	MatchmakeOrEnqueue(ctx context.Context, user *User, task *Task, topic, difficulty string, obfuscateOpponent bool) (*Match, bool, error)
	GetQueueEntry(ctx context.Context, userID uuid.UUID) (*QueueEntry, error)
	CountQueueEntries(ctx context.Context) (int32, error)
	RemoveFromQueue(ctx context.Context, userID uuid.UUID) error
	FindOpenMatchByUser(ctx context.Context, userID uuid.UUID) (*Match, error)
	JoinMatch(ctx context.Context, matchID uuid.UUID, player *Player, starterCode string) (*Match, error)
	SavePlayerCode(ctx context.Context, matchID, userID uuid.UUID, code string) error
	SetPlayerFreeze(ctx context.Context, matchID, userID uuid.UUID, freezeUntil *time.Time) error
	SetPlayerAccepted(ctx context.Context, matchID, userID uuid.UUID, acceptedAt time.Time, runtimeMs int64) error
	FinishMatch(ctx context.Context, matchID uuid.UUID, winnerUserID *uuid.UUID, winnerReason string, finishedAt time.Time) error
	CreateSubmission(ctx context.Context, submission *Submission) (*Submission, error)
	GetLeaderboard(ctx context.Context, limit int32) ([]*LeaderboardEntry, error)
	GetPlayerStats(ctx context.Context, userID uuid.UUID) (*PlayerStats, error)
	ReportPlayerSuspicion(ctx context.Context, matchID, userID uuid.UUID, reason string) error
	SetMatchRatingState(ctx context.Context, matchID uuid.UUID, isRated bool, unratedReason string) error
}
