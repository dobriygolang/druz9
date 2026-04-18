package arena

import (
	"context"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

// Repository is the persistence contract arena's app-service speaks to.
// The queue/matchmaking set (MatchmakeOrEnqueue, GetQueueEntry,
// CountQueueEntries, RemoveFromQueue, FindOpenMatchByUser) and
// GetPlayerStatsBatch / GetSeasonHistory were removed with the
// matchmaking / batch-stats / season-history RPCs. Restore along with
// the transport RPCs if those features come back.
type Repository interface {
	PickRandomTask(ctx context.Context, topic, difficulty string) (*Task, error)
	GetTask(ctx context.Context, taskID uuid.UUID) (*Task, error)
	CreateMatch(ctx context.Context, match *Match, creator *Player, starterCode string) (*Match, error)
	GetMatch(ctx context.Context, matchID uuid.UUID) (*Match, error)
	GetPlayer(ctx context.Context, matchID, userID uuid.UUID) (*Player, error)
	ListMatchesByIDs(ctx context.Context, matchIDs []uuid.UUID) ([]*Match, error)
	ListOpenMatchIDs(ctx context.Context, limit int32) ([]uuid.UUID, error)
	CleanupInactiveMatches(ctx context.Context, idleFor time.Duration) (int64, error)
	CleanupOldSubmissions(ctx context.Context, idleFor time.Duration) (int64, error)
	CleanupFinishedEditorStates(ctx context.Context, idleFor time.Duration) (int64, error)
	JoinMatch(ctx context.Context, matchID uuid.UUID, player *Player, starterCode string) (*Match, error)
	SavePlayerCode(ctx context.Context, matchID, userID uuid.UUID, code string) error
	SavePlayerCodes(ctx context.Context, matchID uuid.UUID, codes map[uuid.UUID]string) error
	SetPlayerFreeze(ctx context.Context, matchID, userID uuid.UUID, freezeUntil *time.Time) error
	SetPlayerAccepted(ctx context.Context, matchID, userID uuid.UUID, acceptedAt time.Time, runtimeMs int64) error
	FinishMatch(ctx context.Context, matchID uuid.UUID, winnerUserID *uuid.UUID, winnerReason model.ArenaWinnerReason, finishedAt time.Time) error
	CreateSubmission(ctx context.Context, submission *Submission) (*Submission, error)
	GetLeaderboard(ctx context.Context, limit int32) ([]*LeaderboardEntry, error)
	GetPlayerStats(ctx context.Context, userID uuid.UUID) (*PlayerStats, error)
	ReportPlayerSuspicion(ctx context.Context, matchID, userID uuid.UUID, reason string) error
	SetMatchRatingState(ctx context.Context, matchID uuid.UUID, isRated bool, unratedReason string) error
	ApplyAntiCheatPenalty(ctx context.Context, matchID, userID uuid.UUID, delta int32, reason string) error
	CreateRatingPenalty(ctx context.Context, penalty *RatingPenalty) error

	// Season operations.
	GetActiveSeason(ctx context.Context) (*model.ArenaSeason, error)
	GetLeaguePosition(ctx context.Context, userID string, rating int32) (rank int32, total int32, err error)
	RunSeasonReset(ctx context.Context, endingSeason int32, newSeason *model.ArenaSeason) error

	// Cross-table leaderboards: guild-of-the-week and season-pass XP.
	// Previously lived as a raw pgxpool aggregator in the api layer.
	ListGuildLeaderboard(ctx context.Context, limit int32) ([]*model.GuildLeaderboardEntry, error)
	ListSeasonXPLeaderboard(ctx context.Context, limit int32) ([]*model.SeasonXPEntry, int32, error)
}
