package arena

import (
	"github.com/jackc/pgx/v5/pgtype"

	domain "api/internal/domain/arena"
)

func scanMatchWithTask(row scanner, match *domain.Match, task *domain.Task, executionProfile *string, runnerMode *int) error {
	return row.Scan(
		&match.ID,
		&match.CreatorUserID,
		&match.TaskID,
		&match.Topic,
		&match.Difficulty,
		&match.Source,
		&match.Status,
		&match.DurationSeconds,
		&match.ObfuscateOpponent,
		&match.IsRated,
		&match.UnratedReason,
		&match.AntiCheatEnabled,
		&match.WinnerUserID,
		&match.WinnerReason,
		&match.StartedAt,
		&match.FinishedAt,
		&match.CreatedAt,
		&match.UpdatedAt,
		&task.ID,
		&task.Title,
		&task.Slug,
		&task.Statement,
		&task.Difficulty,
		&task.Topics,
		&task.StarterCode,
		&task.Language,
		&task.TaskType,
		executionProfile,
		runnerMode,
		&task.DurationSeconds,
		&task.FixtureFiles,
		&task.ReadablePaths,
		&task.WritablePaths,
		&task.AllowedHosts,
		&task.AllowedPorts,
		&task.MockEndpoints,
		&task.WritableTempDir,
		&task.IsActive,
		&task.CreatedAt,
		&task.UpdatedAt,
	)
}

func scanPlayerWithCode(row scanner, player *domain.Player) error {
	return row.Scan(
		&player.MatchID,
		&player.UserID,
		&player.DisplayName,
		&player.Side,
		&player.IsCreator,
		&player.FreezeUntil,
		&player.AcceptedAt,
		&player.BestRuntimeMs,
		&player.IsWinner,
		&player.SuspicionCount,
		&player.AntiCheatPenalized,
		&player.JoinedAt,
		&player.UpdatedAt,
		&player.CurrentCode,
	)
}

func scanLeaderboardEntry(row scanner, item *domain.LeaderboardEntry) error {
	return row.Scan(
		&item.UserID,
		&item.DisplayName,
		&item.Rating,
		&item.Wins,
		&item.Losses,
		&item.Matches,
		&item.WinRate,
		&item.BestRuntime,
		&item.PeakRating,
		new(int32), // current_win_streak — not used in leaderboard entry
		new(int32), // best_win_streak — not used in leaderboard entry
	)
}

func scanPlayerStats(row scanner, item *domain.PlayerStats) error {
	return row.Scan(
		&item.UserID,
		&item.DisplayName,
		&item.Rating,
		&item.Wins,
		&item.Losses,
		&item.Matches,
		&item.WinRate,
		&item.BestRuntime,
		&item.PeakRating,
		&item.CurrentWinStreak,
		&item.BestWinStreak,
	)
}

func scanPlayerWithTimestamps(row scanner, player *domain.Player, freezeUntil, acceptedAt, joinedAt, updatedAt *pgtype.Timestamptz) error {
	return row.Scan(
		&player.MatchID,
		&player.UserID,
		&player.DisplayName,
		&player.Side,
		&player.IsCreator,
		freezeUntil,
		acceptedAt,
		&player.BestRuntimeMs,
		&player.IsWinner,
		&player.SuspicionCount,
		&player.AntiCheatPenalized,
		joinedAt,
		updatedAt,
		&player.CurrentCode,
	)
}
