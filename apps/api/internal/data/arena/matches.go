package arena

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/data/codetasks"
	domain "api/internal/domain/arena"
	arenarating "api/internal/domain/arena/rating"
	"api/internal/model"
)

var (
	ErrMatchNotFound  = errors.New("arena: match not found")
	ErrPlayerNotFound = errors.New("arena: player not found")
	ErrSeasonNotFound = errors.New("arena: season not found")
)

func (r *Repo) CreateMatch(ctx context.Context, match *domain.Match, creator *domain.Player, starterCode string) (*domain.Match, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin create arena match tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	now := time.Now()
	_, err = tx.Exec(ctx, `
		INSERT INTO arena_matches (id, creator_user_id, task_id, topic, difficulty, source, status, duration_seconds, obfuscate_opponent, is_rated, unrated_reason, winner_reason, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
	`, match.ID, match.CreatorUserID, match.TaskID, match.Topic, match.Difficulty, match.Source, match.Status, match.DurationSeconds, match.ObfuscateOpponent, match.IsRated, match.UnratedReason, model.ArenaWinnerReasonUnknown, now)
	if err != nil {
		return nil, fmt.Errorf("insert arena match: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO arena_match_players (match_id, user_id, display_name, side, is_creator, joined_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $6)
	`, match.ID, creator.UserID, creator.DisplayName, creator.Side, creator.IsCreator, now)
	if err != nil {
		return nil, fmt.Errorf("insert arena creator: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO arena_editor_states (match_id, user_id, code, updated_at)
		VALUES ($1, $2, $3, $4)
	`, match.ID, creator.UserID, starterCode, now)
	if err != nil {
		return nil, fmt.Errorf("insert arena editor state: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit create arena match tx: %w", err)
	}

	return r.GetMatch(ctx, match.ID)
}

func (r *Repo) GetMatch(ctx context.Context, matchID uuid.UUID) (*domain.Match, error) {
	var match domain.Match
	var task domain.Task
	var executionProfile string
	var runnerMode int

	err := scanMatchWithTask(r.data.DB.QueryRow(ctx, `
		SELECT
			m.id, m.creator_user_id, m.task_id, m.topic, m.difficulty, m.source, m.status, m.duration_seconds, m.obfuscate_opponent, m.is_rated, m.unrated_reason,
			m.anti_cheat_enabled,
			m.winner_user_id, m.winner_reason, m.started_at, m.finished_at, m.created_at, m.updated_at,
			`+codetasks.SelectColumnsWithAlias("t")+`
		FROM arena_matches m
		JOIN code_tasks t ON t.id = m.task_id
		WHERE m.id = $1
	`, matchID), &match, &task, &executionProfile, &runnerMode)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrMatchNotFound
		}
		return nil, fmt.Errorf("get arena match: %w", err)
	}
	task.ExecutionProfile = model.ExecutionProfileFromString(executionProfile)
	task.RunnerMode = model.RunnerMode(runnerMode)
	if task.RunnerMode.String() == "" {
		task.RunnerMode = model.RunnerModeProgram
	}
	match.Task = &task

	if err := codetasks.LoadCases(ctx, r.data.DB, match.Task); err != nil {
		return nil, fmt.Errorf("load match task cases: %w", err)
	}

	rows, err := r.data.DB.Query(ctx, `
		SELECT p.match_id, p.user_id, p.display_name, p.side, p.is_creator, p.freeze_until, p.accepted_at, p.best_runtime_ms, p.is_winner, p.suspicion_count, p.anti_cheat_penalized, p.joined_at, p.updated_at,
		       COALESCE(es.code, '')
		FROM arena_match_players p
		LEFT JOIN arena_editor_states es ON es.match_id = p.match_id AND es.user_id = p.user_id
		WHERE p.match_id = $1
		ORDER BY CASE WHEN p.side = $2 THEN 0 ELSE 1 END
	`, matchID, model.ArenaPlayerSideLeft)
	if err != nil {
		return nil, fmt.Errorf("list arena players: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var player domain.Player
		if err := scanPlayerWithCode(rows, &player); err != nil {
			return nil, fmt.Errorf("scan arena player: %w", err)
		}
		copyPlayer := player
		match.Players = append(match.Players, &copyPlayer)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate arena player rows: %w", err)
	}

	return &match, nil
}

func (r *Repo) ListOpenMatchIDs(ctx context.Context, limit int32) ([]uuid.UUID, error) {
	if limit <= 0 {
		limit = 12
	}

	rows, err := r.data.DB.Query(ctx, `
		SELECT id
		FROM arena_matches
		WHERE status IN ($1, $2)
		ORDER BY updated_at DESC
		LIMIT $3
	`, model.ArenaMatchStatusWaiting, model.ArenaMatchStatusActive, limit)
	if err != nil {
		return nil, fmt.Errorf("list open arena match ids: %w", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan open arena match id: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate open arena match ids: %w", err)
	}
	return ids, nil
}

func (r *Repo) ListMatchesByIDs(ctx context.Context, matchIDs []uuid.UUID) ([]*domain.Match, error) {
	if len(matchIDs) == 0 {
		return nil, nil
	}

	idStrings := make([]string, len(matchIDs))
	for i, id := range matchIDs {
		idStrings[i] = id.String()
	}

	rows, err := r.data.DB.Query(ctx, `
		SELECT
			m.id, m.creator_user_id, m.task_id, m.topic, m.difficulty, m.source, m.status, m.duration_seconds, m.obfuscate_opponent, m.is_rated, m.unrated_reason,
			m.anti_cheat_enabled,
			m.winner_user_id, m.winner_reason, m.started_at, m.finished_at, m.created_at, m.updated_at,
			`+codetasks.SelectColumnsWithAlias("t")+`
		FROM arena_matches m
		JOIN code_tasks t ON t.id = m.task_id
		WHERE m.id = ANY($1)
		  AND m.status IN ($2, $3)
		ORDER BY m.updated_at DESC
	`, idStrings, model.ArenaMatchStatusWaiting, model.ArenaMatchStatusActive)
	if err != nil {
		return nil, fmt.Errorf("list arena matches by ids: %w", err)
	}
	defer rows.Close()

	matches := make([]*domain.Match, 0, len(matchIDs))
	matchMap := make(map[uuid.UUID]*domain.Match)
	tasks := make([]*domain.Task, 0, len(matchIDs))

	for rows.Next() {
		var match domain.Match
		var task domain.Task
		var executionProfile string
		var runnerMode int

		if err := scanMatchWithTask(rows, &match, &task, &executionProfile, &runnerMode); err != nil {
			return nil, fmt.Errorf("scan arena match: %w", err)
		}
		task.ExecutionProfile = model.ExecutionProfileFromString(executionProfile)
		task.RunnerMode = model.RunnerMode(runnerMode)
		if task.RunnerMode.String() == "" {
			task.RunnerMode = model.RunnerModeProgram
		}
		match.Task = &task

		matches = append(matches, &match)
		matchMap[match.ID] = &match
		tasks = append(tasks, &task)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate arena matches: %w", err)
	}

	if len(tasks) > 0 {
		if err := codetasks.LoadCasesMultiple(ctx, r.data.DB, tasks); err != nil {
			return nil, fmt.Errorf("load match tasks cases: %w", err)
		}
	}

	if len(matches) > 0 {
		if err := r.loadPlayersForMatches(ctx, matches, matchMap); err != nil {
			return nil, err
		}
	}

	return matches, nil
}

func (r *Repo) CleanupInactiveMatches(ctx context.Context, idleFor time.Duration) (int64, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return 0, fmt.Errorf("begin cleanup inactive arena matches tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var totalAffected int64

	deleteTag, err := tx.Exec(ctx, `
		DELETE FROM arena_matches am
		WHERE am.status = $1
		  AND am.source = $2
		  AND am.updated_at < NOW() - $3::interval
	`,
		model.ArenaMatchStatusWaiting,
		model.ArenaMatchSourceInvite,
		idleFor.String(),
	)
	if err != nil {
		return 0, fmt.Errorf("cleanup waiting arena matches: %w", err)
	}
	totalAffected += deleteTag.RowsAffected()

	finishTag, err := tx.Exec(ctx, `
		UPDATE arena_matches
		SET status = $2,
		    winner_user_id = NULL,
		    winner_reason = $3,
		    finished_at = NOW(),
		    updated_at = NOW()
		WHERE status = $1
		  AND updated_at < NOW() - $4::interval
	`,
		model.ArenaMatchStatusActive,
		model.ArenaMatchStatusFinished,
		model.ArenaWinnerReasonNone,
		idleFor.String(),
	)
	if err != nil {
		return 0, fmt.Errorf("finish stale active arena matches: %w", err)
	}
	totalAffected += finishTag.RowsAffected()

	if finishTag.RowsAffected() > 0 {
		if _, err := tx.Exec(ctx, `
			UPDATE arena_match_players p
			SET is_winner = FALSE
			WHERE EXISTS (
				SELECT 1
				FROM arena_matches am
				WHERE am.id = p.match_id
				  AND am.status = $1
				  AND am.winner_user_id IS NULL
				  AND am.winner_reason = $2
				  AND am.finished_at IS NOT NULL
				  AND am.updated_at >= NOW() - INTERVAL '5 seconds'
			)
		`,
			model.ArenaMatchStatusFinished,
			model.ArenaWinnerReasonNone,
		); err != nil {
			return 0, fmt.Errorf("reset stale arena winners: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit cleanup inactive arena matches tx: %w", err)
	}

	return totalAffected, nil
}

func (r *Repo) CountOpenMatches(ctx context.Context, activeSince time.Time) (int, error) {
	var count int
	err := r.data.DB.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM arena_matches
		WHERE status IN ($1, $2)
		  AND updated_at >= $3
	`, model.ArenaMatchStatusWaiting, model.ArenaMatchStatusActive, activeSince).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count open arena matches: %w", err)
	}
	return count, nil
}

func (r *Repo) JoinMatch(ctx context.Context, matchID uuid.UUID, player *domain.Player, starterCode string) (*domain.Match, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin join arena tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var existingSide string
	err = tx.QueryRow(ctx, `SELECT side FROM arena_match_players WHERE match_id = $1 AND user_id = $2`, matchID, player.UserID).Scan(&existingSide)
	if err == nil {
		return r.GetMatch(ctx, matchID)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("check existing arena player: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO arena_match_players (match_id, user_id, display_name, side, is_creator, joined_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
	`, matchID, player.UserID, player.DisplayName, player.Side, player.IsCreator)
	if err != nil {
		return nil, fmt.Errorf("insert arena player: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO arena_editor_states (match_id, user_id, code, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (match_id, user_id) DO NOTHING
	`, matchID, player.UserID, starterCode)
	if err != nil {
		return nil, fmt.Errorf("insert arena player editor: %w", err)
	}

	var playersCount int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM arena_match_players WHERE match_id = $1`, matchID).Scan(&playersCount); err != nil {
		return nil, fmt.Errorf("count arena players: %w", err)
	}
	if playersCount >= 2 {
		_, err = tx.Exec(ctx, `
			UPDATE arena_matches
			SET status = $2, started_at = COALESCE(started_at, NOW()), updated_at = NOW()
			WHERE id = $1
		`, matchID, model.ArenaMatchStatusActive)
		if err != nil {
			return nil, fmt.Errorf("activate arena match: %w", err)
		}
	} else {
		_, err = tx.Exec(ctx, `UPDATE arena_matches SET updated_at = NOW() WHERE id = $1`, matchID)
		if err != nil {
			return nil, fmt.Errorf("touch arena match: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit join arena tx: %w", err)
	}

	return r.GetMatch(ctx, matchID)
}

func (r *Repo) SetMatchRatingState(ctx context.Context, matchID uuid.UUID, isRated bool, unratedReason string) error {
	if _, err := r.data.DB.Exec(ctx, `
		UPDATE arena_matches
		SET is_rated = $2,
		    unrated_reason = $3,
		    updated_at = NOW()
		WHERE id = $1
	`, matchID, isRated, unratedReason); err != nil {
		return fmt.Errorf("set arena match rating state: %w", err)
	}
	return nil
}

func (r *Repo) FinishMatch(ctx context.Context, matchID uuid.UUID, winnerUserID *uuid.UUID, winnerReason model.ArenaWinnerReason, finishedAt time.Time) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin finish arena match tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var isRated bool
	var unratedReason string
	var difficulty model.ArenaDifficulty
	if err := tx.QueryRow(ctx, `
		SELECT is_rated, unrated_reason, difficulty
		FROM arena_matches
		WHERE id = $1
	`, matchID).Scan(&isRated, &unratedReason, &difficulty); err != nil {
		return fmt.Errorf("load arena rating state: %w", err)
	}

	if winnerUserID != nil {
		if _, err := tx.Exec(ctx, `
			UPDATE arena_match_players
			SET is_winner = CASE WHEN user_id = $2 THEN TRUE ELSE FALSE END
			WHERE match_id = $1
		`, matchID, winnerUserID); err != nil {
			return fmt.Errorf("set arena winners: %w", err)
		}
	} else {
		if _, err := tx.Exec(ctx, `UPDATE arena_match_players SET is_winner = FALSE WHERE match_id = $1`, matchID); err != nil {
			return fmt.Errorf("reset arena winners: %w", err)
		}
	}

	if _, err := tx.Exec(ctx, `
		UPDATE arena_matches
		SET status = $2, winner_user_id = $3, winner_reason = $4, finished_at = $5, is_rated = $6, unrated_reason = $7, updated_at = NOW()
		WHERE id = $1
	`, matchID, model.ArenaMatchStatusFinished, winnerUserID, winnerReason, finishedAt, isRated, unratedReason); err != nil {
		return fmt.Errorf("update arena match finish: %w", err)
	}

	rows, err := tx.Query(ctx, `
		SELECT
			p.user_id,
			COALESCE(NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), ''), NULLIF(u.username, ''), p.display_name),
			p.is_winner,
			p.best_runtime_ms,
			COALESCE(aps.rating, $2) AS rating,
			(u.id IS NOT NULL) AS is_registered
		FROM arena_match_players p
		LEFT JOIN arena_player_stats aps ON aps.user_id = p.user_id
		LEFT JOIN users u ON u.id = p.user_id
		WHERE p.match_id = $1
		ORDER BY p.joined_at ASC
	`, matchID, arenarating.DefaultRating)
	if err != nil {
		return fmt.Errorf("load arena finish players: %w", err)
	}
	defer rows.Close()

	type finisher struct {
		userID      uuid.UUID
		displayName string
		isWinner    bool
		bestRuntime int64
		rating      int32
		countStats  bool
	}
	finishers := make([]finisher, 0, 2)
	for rows.Next() {
		var item finisher
		if err := rows.Scan(&item.userID, &item.displayName, &item.isWinner, &item.bestRuntime, &item.rating, &item.countStats); err != nil {
			return fmt.Errorf("scan arena finish player: %w", err)
		}
		finishers = append(finishers, item)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate arena finish players: %w", err)
	}

	if isRated && len(finishers) > 0 {
		type ratingUpdate struct {
			userID      uuid.UUID
			displayName string
			nextRating  int32
			wins        int
			losses      int
			bestRuntime int64
		}

		updates := make([]ratingUpdate, 0, len(finishers))
		for i, self := range finishers {
			if !self.countStats {
				continue
			}

			opponentRating := arenarating.DefaultRating
			score := 0.5

			if len(finishers) == 2 {
				otherIdx := 0
				if i == 0 {
					otherIdx = 1
				}
				other := finishers[otherIdx]

				if other.countStats {
					opponentRating = other.rating
				}
				if self.isWinner {
					score = 1
				} else if winnerUserID != nil {
					score = 0
				}
			} else if self.isWinner {
				score = 1
			}

			nextRating := arenaNextRating(self.rating, opponentRating, score, difficulty.String())
			wins := 0
			losses := 0
			switch score {
			case 1:
				wins = 1
			case 0:
				losses = 1
			}

			updates = append(updates, ratingUpdate{
				userID:      self.userID,
				displayName: self.displayName,
				nextRating:  nextRating,
				wins:        wins,
				losses:      losses,
				bestRuntime: self.bestRuntime,
			})
		}

		if len(updates) > 0 {
			userIDs := make([]string, len(updates))
			displayNames := make([]string, len(updates))
			ratings := make([]int32, len(updates))
			wins := make([]int, len(updates))
			losses := make([]int, len(updates))
			bestRuntimes := make([]int64, len(updates))

			for i, u := range updates {
				userIDs[i] = u.userID.String()
				displayNames[i] = u.displayName
				ratings[i] = u.nextRating
				wins[i] = u.wins
				losses[i] = u.losses
				bestRuntimes[i] = u.bestRuntime
			}

			if _, err := tx.Exec(ctx, "\n\t\t\t\tINSERT INTO arena_player_stats (user_id, display_name, rating, wins, losses, matches, best_runtime_ms, peak_rating, current_win_streak, best_win_streak, updated_at)\n\t\t\t\tSELECT u::uuid, d, r, w, l, 1, br, r, w, NOW()\n\t\t\t\tFROM unnest($1::text[], $2::text[], $3::int4[], $4::int4[], $5::int4[], $6::int8[]) AS uu(u, d, r, w, l, br)\n\t\t\t\tON CONFLICT (user_id) DO UPDATE SET\n\t\t\t\t  display_name = EXCLUDED.display_name,\n\t\t\t\t  rating = EXCLUDED.rating,\n\t\t\t\t  wins = arena_player_stats.wins + EXCLUDED.wins,\n\t\t\t\t  losses = arena_player_stats.losses + EXCLUDED.losses,\n\t\t\t\t  matches = arena_player_stats.matches + 1,\n\t\t\t\t  best_runtime_ms = CASE\n\t\t\t\t    WHEN arena_player_stats.best_runtime_ms = 0 THEN EXCLUDED.best_runtime_ms\n\t\t\t\t    WHEN EXCLUDED.best_runtime_ms = 0 THEN arena_player_stats.best_runtime_ms\n\t\t\t\t    ELSE LEAST(arena_player_stats.best_runtime_ms, EXCLUDED.best_runtime_ms)\n\t\t\t\t  END,\n\t\t\t\t  peak_rating = GREATEST(arena_player_stats.peak_rating, EXCLUDED.rating),\n\t\t\t\t  current_win_streak = CASE\n\t\t\t\t    WHEN EXCLUDED.wins > 0 THEN arena_player_stats.current_win_streak + 1\n\t\t\t\t    WHEN EXCLUDED.losses > 0 THEN 0\n\t\t\t\t    ELSE arena_player_stats.current_win_streak\n\t\t\t\t  END,\n\t\t\t\t  best_win_streak = GREATEST(\n\t\t\t\t    arena_player_stats.best_win_streak,\n\t\t\t\t    CASE WHEN EXCLUDED.wins > 0 THEN arena_player_stats.current_win_streak + 1 ELSE arena_player_stats.current_win_streak END\n\t\t\t\t  ),\n\t\t\t\t  updated_at = NOW()\n\t\t\t", userIDs, displayNames, ratings, wins, losses, bestRuntimes); err != nil {
				return fmt.Errorf("upsert arena player stats batch: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit finish arena match tx: %w", err)
	}
	return nil
}
