package arena

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	arenarating "api/internal/arena/rating"
	"api/internal/data/codetasks"
	domain "api/internal/domain/arena"
	"api/internal/model"
	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const leaderboardSelect = `
	SELECT
		aps.user_id::text,
		COALESCE(NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), ''), NULLIF(u.telegram_username, ''), aps.display_name),
		aps.rating,
		aps.wins,
		aps.losses,
		aps.matches,
		CASE WHEN aps.matches = 0 THEN 0 ELSE aps.wins::float8 / aps.matches::float8 END AS win_rate,
		COALESCE(aps.best_runtime_ms, 0)::bigint
	FROM arena_player_stats aps
	LEFT JOIN users u ON u.id = aps.user_id
`

type scanner interface {
	Scan(dest ...any) error
}

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(dataLayer *postgres.Store, logger log.Logger) *Repo {
	return &Repo{
		data: dataLayer,
		log:  log.NewHelper(logger),
	}
}

func (r *Repo) PickRandomTask(ctx context.Context, topic, difficulty string) (*domain.Task, error) {
	difficultyValue := model.TaskDifficultyFromString(difficulty)
	var task domain.Task
	err := codetasks.ScanTask(r.data.DB.QueryRow(ctx, `
		SELECT `+codetasks.SelectColumns+`
		FROM code_tasks
		WHERE is_active = TRUE
		  AND ($1 = '' OR $1 = ANY(topics))
		  AND ($2 = 0 OR difficulty = $2)
		ORDER BY random()
		LIMIT 1
	`, topic, difficultyValue), &task)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("pick random task: %w", err)
	}
	if err := codetasks.LoadCases(ctx, r.data.DB, &task); err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *Repo) GetTask(ctx context.Context, taskID uuid.UUID) (*domain.Task, error) {
	var task domain.Task
	err := codetasks.ScanTask(r.data.DB.QueryRow(ctx, `
		SELECT `+codetasks.SelectColumns+`
		FROM code_tasks
		WHERE id = $1
	`, taskID), &task)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get arena task: %w", err)
	}
	if err := codetasks.LoadCases(ctx, r.data.DB, &task); err != nil {
		return nil, err
	}

	return &task, nil
}

func (r *Repo) CreateMatch(ctx context.Context, match *domain.Match, creator *domain.Player, starterCode string) (*domain.Match, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin create arena match tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		INSERT INTO arena_matches (id, creator_user_id, task_id, topic, difficulty, source, status, duration_seconds, obfuscate_opponent, is_rated, unrated_reason, winner_reason, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
	`, match.ID, match.CreatorUserID, match.TaskID, match.Topic, match.Difficulty, match.Source, match.Status, match.DurationSeconds, match.ObfuscateOpponent, match.IsRated, match.UnratedReason, match.WinnerReason)
	if err != nil {
		return nil, fmt.Errorf("insert arena match: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO arena_match_players (match_id, user_id, display_name, side, is_creator, joined_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
	`, match.ID, creator.UserID, creator.DisplayName, creator.Side, creator.IsCreator)
	if err != nil {
		return nil, fmt.Errorf("insert arena creator: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO arena_editor_states (match_id, user_id, code, updated_at)
		VALUES ($1, $2, $3, NOW())
	`, match.ID, creator.UserID, starterCode)
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
			m.winner_user_id, m.winner_reason, m.started_at, m.finished_at, m.created_at, m.updated_at,
			`+codetasks.SelectColumnsWithAlias("t")+`
		FROM arena_matches m
		JOIN code_tasks t ON t.id = m.task_id
		WHERE m.id = $1
	`, matchID), &match, &task, &executionProfile, &runnerMode)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get arena match: %w", err)
	}
	task.ExecutionProfile = model.ExecutionProfileFromString(executionProfile)
	task.RunnerMode = model.RunnerMode(runnerMode)
	if task.RunnerMode.String() == "" {
		task.RunnerMode = model.RunnerModeProgram
	}
	match.Task = &task

	// Load test cases for the task
	if err := codetasks.LoadCases(ctx, r.data.DB, match.Task); err != nil {
		return nil, err
	}

	rows, err := r.data.DB.Query(ctx, `
		SELECT p.match_id, p.user_id, p.display_name, p.side, p.is_creator, p.freeze_until, p.accepted_at, p.best_runtime_ms, p.is_winner, p.suspicion_count, p.joined_at, p.updated_at,
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
	return ids, nil
}

func (r *Repo) CleanupInactiveMatches(ctx context.Context, idleFor time.Duration) (int64, error) {
	tag, err := r.data.DB.Exec(ctx, `
		DELETE FROM arena_matches am
		WHERE am.status = $1
		  AND am.source = $2
		  AND am.updated_at < NOW() - $3::interval
	`, model.ArenaMatchStatusWaiting, model.ArenaMatchSourceInvite, idleFor.String())
	if err != nil {
		return 0, fmt.Errorf("cleanup inactive arena matches: %w", err)
	}
	return tag.RowsAffected(), nil
}

func (r *Repo) MatchmakeOrEnqueue(ctx context.Context, user *domain.User, task *domain.Task, topic, difficulty string, obfuscateOpponent bool) (*domain.Match, bool, error) {
	if user == nil {
		return nil, false, nil
	}

	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, false, fmt.Errorf("begin arena queue tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var opponent domain.QueueEntry
	err = tx.QueryRow(ctx, `
		SELECT user_id, display_name, topic, difficulty, queued_at, updated_at
		FROM arena_match_queue
		WHERE user_id <> $1
		  AND topic = $2
		  AND difficulty = $3
		ORDER BY queued_at ASC
		FOR UPDATE SKIP LOCKED
		LIMIT 1
	`, user.ID, topic, model.ArenaDifficultyFromString(difficulty)).Scan(
		&opponent.UserID, &opponent.DisplayName, &opponent.Topic, &opponent.Difficulty, &opponent.QueuedAt, &opponent.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		_, err = tx.Exec(ctx, `
			INSERT INTO arena_match_queue (user_id, display_name, topic, difficulty, queued_at, updated_at)
			VALUES ($1, $2, $3, $4, NOW(), NOW())
			ON CONFLICT (user_id)
			DO UPDATE SET display_name = EXCLUDED.display_name, topic = EXCLUDED.topic, difficulty = EXCLUDED.difficulty, updated_at = NOW()
		`, user.ID, resolveArenaDisplayName(user), topic, model.ArenaDifficultyFromString(difficulty))
		if err != nil {
			return nil, false, fmt.Errorf("enqueue arena player: %w", err)
		}
		if err := tx.Commit(ctx); err != nil {
			return nil, false, fmt.Errorf("commit arena enqueue tx: %w", err)
		}
		return nil, false, nil
	}
	if err != nil {
		return nil, false, fmt.Errorf("select arena queue opponent: %w", err)
	}

	nowTime := time.Now().UTC()
	matchID := uuid.New()
	currentDisplayName := resolveArenaDisplayName(user)
	match := &domain.Match{
		ID:                matchID,
		CreatorUserID:     opponent.UserID,
		TaskID:            task.ID,
		Topic:             topic,
		Difficulty:        model.ArenaDifficultyFromString(difficulty),
		Source:            domain.MatchSourceMatchmaking,
		Status:            domain.MatchStatusActive,
		DurationSeconds:   600,
		ObfuscateOpponent: obfuscateOpponent,
		WinnerReason:      domain.WinnerReasonNone,
		CreatedAt:         nowTime,
		UpdatedAt:         nowTime,
		StartedAt:         &nowTime,
	}

	if _, err := tx.Exec(ctx, `DELETE FROM arena_match_queue WHERE user_id IN ($1, $2)`, user.ID, opponent.UserID); err != nil {
		return nil, false, fmt.Errorf("delete arena queue entries: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO arena_matches (id, creator_user_id, task_id, topic, difficulty, source, status, duration_seconds, obfuscate_opponent, is_rated, unrated_reason, winner_reason, started_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, $13)
	`, matchID, opponent.UserID, task.ID, topic, match.Difficulty, match.Source, model.ArenaMatchStatusActive, match.DurationSeconds, obfuscateOpponent, true, "", match.WinnerReason, nowTime); err != nil {
		return nil, false, fmt.Errorf("insert matched arena match: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO arena_match_players (match_id, user_id, display_name, side, is_creator, joined_at, updated_at)
		VALUES
		  ($1, $2, $3, $5, TRUE, $4, $4),
		  ($1, $6, $7, $8, FALSE, $4, $4)
	`, matchID, opponent.UserID, opponent.DisplayName, nowTime, model.ArenaPlayerSideLeft, user.ID, currentDisplayName, model.ArenaPlayerSideRight); err != nil {
		return nil, false, fmt.Errorf("insert matched arena players: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO arena_editor_states (match_id, user_id, code, updated_at)
		VALUES
		  ($1, $2, $4, $3),
		  ($1, $5, $4, $3)
	`, matchID, opponent.UserID, nowTime, task.StarterCode, user.ID); err != nil {
		return nil, false, fmt.Errorf("insert matched arena editor states: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, false, fmt.Errorf("commit arena matchmake tx: %w", err)
	}
	created, err := r.GetMatch(ctx, matchID)
	if err != nil {
		return nil, false, err
	}
	return created, true, nil
}

func (r *Repo) GetQueueEntry(ctx context.Context, userID uuid.UUID) (*domain.QueueEntry, error) {
	var item domain.QueueEntry
	err := r.data.DB.QueryRow(ctx, `
		SELECT user_id, display_name, topic, difficulty, queued_at, updated_at
		FROM arena_match_queue
		WHERE user_id = $1
	`, userID).Scan(&item.UserID, &item.DisplayName, &item.Topic, &item.Difficulty, &item.QueuedAt, &item.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get arena queue entry: %w", err)
	}
	return &item, nil
}

func (r *Repo) CountQueueEntries(ctx context.Context) (int32, error) {
	var count int32
	if err := r.data.DB.QueryRow(ctx, `SELECT COUNT(*)::int FROM arena_match_queue`).Scan(&count); err != nil {
		return 0, fmt.Errorf("count arena queue entries: %w", err)
	}
	return count, nil
}

func (r *Repo) RemoveFromQueue(ctx context.Context, userID uuid.UUID) error {
	if _, err := r.data.DB.Exec(ctx, `DELETE FROM arena_match_queue WHERE user_id = $1`, userID); err != nil {
		return fmt.Errorf("remove arena queue entry: %w", err)
	}
	return nil
}

func (r *Repo) FindOpenMatchByUser(ctx context.Context, userID uuid.UUID) (*domain.Match, error) {
	var matchID uuid.UUID
	err := r.data.DB.QueryRow(ctx, `
		SELECT m.id
		FROM arena_matches m
		JOIN arena_match_players p ON p.match_id = m.id
		WHERE p.user_id = $1
		  AND m.status IN ($2, $3)
		  AND m.source = $4
		ORDER BY m.updated_at DESC
		LIMIT 1
	`, userID, model.ArenaMatchStatusWaiting, model.ArenaMatchStatusActive, model.ArenaMatchSourceMatchmaking).Scan(&matchID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("find open arena match by user: %w", err)
	}
	return r.GetMatch(ctx, matchID)
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

func (r *Repo) SavePlayerCode(ctx context.Context, matchID, userID uuid.UUID, code string) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO arena_editor_states (match_id, user_id, code, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (match_id, user_id)
		DO UPDATE SET code = EXCLUDED.code, updated_at = NOW()
	`, matchID, userID, code)
	if err != nil {
		return fmt.Errorf("save arena player code: %w", err)
	}
	_, err = r.data.DB.Exec(ctx, `UPDATE arena_matches SET updated_at = NOW() WHERE id = $1`, matchID)
	if err != nil {
		return fmt.Errorf("touch arena match after code save: %w", err)
	}
	return nil
}

func (r *Repo) SetPlayerFreeze(ctx context.Context, matchID, userID uuid.UUID, freezeUntil *time.Time) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE arena_match_players
		SET freeze_until = $3, updated_at = NOW()
		WHERE match_id = $1 AND user_id = $2
	`, matchID, userID, freezeUntil)
	if err != nil {
		return fmt.Errorf("set arena freeze: %w", err)
	}
	_, err = r.data.DB.Exec(ctx, `UPDATE arena_matches SET updated_at = NOW() WHERE id = $1`, matchID)
	if err != nil {
		return fmt.Errorf("touch arena match after freeze: %w", err)
	}
	return nil
}

func (r *Repo) SetPlayerAccepted(ctx context.Context, matchID, userID uuid.UUID, acceptedAt time.Time, runtimeMs int64) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE arena_match_players
		SET accepted_at = COALESCE(accepted_at, $3),
		    best_runtime_ms = CASE
		      WHEN best_runtime_ms = 0 THEN $4
		      WHEN $4 = 0 THEN best_runtime_ms
		      ELSE LEAST(best_runtime_ms, $4)
		    END,
		    updated_at = NOW()
		WHERE match_id = $1 AND user_id = $2
	`, matchID, userID, acceptedAt, runtimeMs)
	if err != nil {
		return fmt.Errorf("set arena accepted: %w", err)
	}
	_, err = r.data.DB.Exec(ctx, `UPDATE arena_matches SET updated_at = NOW() WHERE id = $1`, matchID)
	if err != nil {
		return fmt.Errorf("touch arena match after accepted: %w", err)
	}
	return nil
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

	// Reset all winners and set new winner in single query
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
			COALESCE(NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), ''), NULLIF(u.telegram_username, ''), p.display_name),
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
		for index := range finishers {
			self := finishers[index]
			if !self.countStats {
				continue
			}
			opponentRating := arenarating.DefaultRating
			score := 0.5
			if len(finishers) == 2 {
				if finishers[1-index].countStats {
					opponentRating = finishers[1-index].rating
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
			if score == 1 {
				wins = 1
			} else if score == 0 {
				losses = 1
			}

			if _, err := tx.Exec(ctx, `
				INSERT INTO arena_player_stats (user_id, display_name, rating, wins, losses, matches, best_runtime_ms, updated_at)
				VALUES ($1, $2, $3, $4, $5, 1, $6, NOW())
				ON CONFLICT (user_id) DO UPDATE SET
				  display_name = EXCLUDED.display_name,
				  rating = EXCLUDED.rating,
				  wins = arena_player_stats.wins + EXCLUDED.wins,
				  losses = arena_player_stats.losses + EXCLUDED.losses,
				  matches = arena_player_stats.matches + 1,
				  best_runtime_ms = CASE
				    WHEN arena_player_stats.best_runtime_ms = 0 THEN EXCLUDED.best_runtime_ms
				    WHEN EXCLUDED.best_runtime_ms = 0 THEN arena_player_stats.best_runtime_ms
				    ELSE LEAST(arena_player_stats.best_runtime_ms, EXCLUDED.best_runtime_ms)
				  END,
				  updated_at = NOW()
			`, self.userID, self.displayName, nextRating, wins, losses, self.bestRuntime); err != nil {
				return fmt.Errorf("upsert arena player stats: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit finish arena match tx: %w", err)
	}
	return nil
}

func (r *Repo) CreateSubmission(ctx context.Context, submission *domain.Submission) (*domain.Submission, error) {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO arena_submissions (id, match_id, user_id, code, output, error, runtime_ms, is_correct, passed_count, total_count, submitted_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
	`, submission.ID, submission.MatchID, submission.UserID, submission.Code, submission.Output, submission.Error, submission.RuntimeMs, submission.IsCorrect, submission.PassedCount, submission.TotalCount)
	if err != nil {
		return nil, fmt.Errorf("create arena submission: %w", err)
	}
	if _, err := r.data.DB.Exec(ctx, `UPDATE arena_matches SET updated_at = NOW() WHERE id = $1`, submission.MatchID); err != nil {
		return nil, fmt.Errorf("touch arena match after submission: %w", err)
	}
	return submission, nil
}

func (r *Repo) ReportPlayerSuspicion(ctx context.Context, matchID, userID uuid.UUID, reason string) error {
	if _, err := r.data.DB.Exec(ctx, `
		UPDATE arena_match_players
		SET suspicion_count = suspicion_count + 1,
		    last_suspicion_reason = $3,
		    last_suspicion_at = NOW(),
		    updated_at = NOW()
		WHERE match_id = $1 AND user_id = $2
	`, matchID, userID, reason); err != nil {
		return fmt.Errorf("report arena suspicion: %w", err)
	}
	if _, err := r.data.DB.Exec(ctx, `
		UPDATE arena_matches
		SET is_rated = FALSE,
		    unrated_reason = 'anti_cheat',
		    updated_at = NOW()
		WHERE id = $1
	`, matchID); err != nil {
		return fmt.Errorf("mark arena match unrated after suspicion: %w", err)
	}
	return nil
}

func (r *Repo) GetLeaderboard(ctx context.Context, limit int32) ([]*domain.LeaderboardEntry, error) {
	if limit <= 0 {
		limit = 20
	}

	rows, err := r.data.DB.Query(ctx, `
		`+leaderboardSelect+`
		ORDER BY aps.rating DESC, aps.wins DESC, aps.best_runtime_ms ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("get arena leaderboard: %w", err)
	}
	defer rows.Close()

	var entries []*domain.LeaderboardEntry
	for rows.Next() {
		var item domain.LeaderboardEntry
		if err := scanLeaderboardEntry(rows, &item); err != nil {
			return nil, fmt.Errorf("scan arena leaderboard: %w", err)
		}
		item.League = arenaLeague(item.Rating)
		copyItem := item
		entries = append(entries, &copyItem)
	}
	return entries, nil
}

func (r *Repo) GetPlayerStats(ctx context.Context, userID uuid.UUID) (*domain.PlayerStats, error) {
	var item domain.PlayerStats
	err := scanPlayerStats(r.data.DB.QueryRow(ctx, leaderboardSelect+`
		WHERE aps.user_id = $1
	`, userID), &item)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get arena player stats: %w", err)
	}
	item.League = arenaLeague(item.Rating)
	return &item, nil
}

func resolveArenaDisplayName(user *domain.User) string {
	if user == nil {
		return "Игрок"
	}
	value := user.FirstName
	if user.LastName != "" {
		value = strings.TrimSpace(value + " " + user.LastName)
	}
	if value != "" {
		return value
	}
	if user.TelegramUsername != "" {
		return user.TelegramUsername
	}
	return "Игрок"
}

func arenaNextRating(self, opponent int32, score float64, difficulty string) int32 {
	return arenarating.NextRating(self, opponent, score, difficulty)
}

func arenaLeague(rating int32) model.ArenaLeague {
	return model.ArenaLeagueFromString(arenarating.LeagueName(rating))
}

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
	)
}
