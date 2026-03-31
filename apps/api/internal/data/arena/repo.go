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
	"github.com/jackc/pgx/v5/pgtype"
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

	// Batch insert match, player, and editor state in single transaction
	// Using multi-row INSERT for players and editor states
	now := time.Now()
	_, err = tx.Exec(ctx, `
		INSERT INTO arena_matches (id, creator_user_id, task_id, topic, difficulty, source, status, duration_seconds, obfuscate_opponent, is_rated, unrated_reason, winner_reason, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
	`, match.ID, match.CreatorUserID, match.TaskID, match.Topic, match.Difficulty, match.Source, match.Status, match.DurationSeconds, match.ObfuscateOpponent, match.IsRated, match.UnratedReason, match.WinnerReason, now)
	if err != nil {
		return nil, fmt.Errorf("insert arena match: %w", err)
	}

	// Batch insert player and editor state in single query
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

// ListMatchesByIDs loads multiple matches in a single query (batch optimization).
func (r *Repo) ListMatchesByIDs(ctx context.Context, matchIDs []uuid.UUID) ([]*domain.Match, error) {
	if len(matchIDs) == 0 {
		return nil, nil
	}

	// Convert UUIDs to strings for SQL ANY query
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

	// Batch load test cases for all tasks
	if len(tasks) > 0 {
		if err := codetasks.LoadCasesMultiple(ctx, r.data.DB, tasks); err != nil {
			return nil, err
		}
	}

	// Batch load players for all matches
	if len(matches) > 0 {
		if err := r.loadPlayersForMatches(ctx, matches, matchMap); err != nil {
			return nil, err
		}
	}

	return matches, nil
}

// loadPlayersForMatches batch loads players for multiple matches.
func (r *Repo) loadPlayersForMatches(ctx context.Context, matches []*domain.Match, matchMap map[uuid.UUID]*domain.Match) error {
	if len(matches) == 0 {
		return nil
	}

	matchIDs := make([]any, len(matches))
	for i, m := range matches {
		matchIDs[i] = m.ID
	}

	rows, err := r.data.DB.Query(ctx, `
		SELECT p.match_id, p.user_id, p.display_name, p.side, p.is_creator,
		       p.freeze_until, p.accepted_at, p.best_runtime_ms, p.is_winner,
		       p.suspicion_count, p.anti_cheat_penalized, p.joined_at, p.updated_at,
		       COALESCE(es.code, '')
		FROM arena_match_players p
		LEFT JOIN arena_editor_states es ON es.match_id = p.match_id AND es.user_id = p.user_id
		WHERE p.match_id = ANY($1)
		ORDER BY p.match_id, CASE WHEN p.side = $2 THEN 0 ELSE 1 END
	`, matchIDs, model.ArenaPlayerSideLeft)
	if err != nil {
		return fmt.Errorf("list arena players batch: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var matchID uuid.UUID
		var player domain.Player
		if err := scanPlayerWithCode(rows, &player); err != nil {
			return fmt.Errorf("scan arena player batch: %w", err)
		}
		matchID = player.MatchID

		if match, ok := matchMap[matchID]; ok {
			match.Players = append(match.Players, &player)
		}
	}

	return rows.Err()
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

func (r *Repo) SavePlayerCodes(ctx context.Context, matchID uuid.UUID, codes map[uuid.UUID]string) error {
	if len(codes) == 0 {
		return nil
	}

	// Batch upsert using unnest for O(1) instead of N separate queries
	userIDs := make([]string, 0, len(codes))
	codeValues := make([]string, 0, len(codes))
	for userID, code := range codes {
		userIDs = append(userIDs, userID.String())
		codeValues = append(codeValues, code)
	}

	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO arena_editor_states (match_id, user_id, code, updated_at)
		SELECT $1::uuid, u::uuid, c, NOW()
		FROM unnest($2::text[], $3::text[]) AS uu(u, c)
		ON CONFLICT (match_id, user_id) DO UPDATE SET
			code = EXCLUDED.code,
			updated_at = NOW()
	`, matchID, userIDs, codeValues)
	if err != nil {
		return fmt.Errorf("save arena player codes batch: %w", err)
	}

	_, err = r.data.DB.Exec(ctx, `UPDATE arena_matches SET updated_at = NOW() WHERE id = $1`, matchID)
	if err != nil {
		return fmt.Errorf("touch arena match after codes save: %w", err)
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
		// Pre-calculate all ratings once (batch calculation)
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
			// Batch upsert using unnest for O(1) instead of N separate queries
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

			if _, err := tx.Exec(ctx, `
				INSERT INTO arena_player_stats (user_id, display_name, rating, wins, losses, matches, best_runtime_ms, updated_at)
				SELECT u::uuid, d, r, w, l, 1, br, NOW()
				FROM unnest($1::text[], $2::text[], $3::int4[], $4::int4[], $5::int4[], $6::int8[]) AS uu(u, d, r, w, l, br)
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
			`, userIDs, displayNames, ratings, wins, losses, bestRuntimes); err != nil {
				return fmt.Errorf("upsert arena player stats batch: %w", err)
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
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin report arena suspicion tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	res, err := tx.Exec(ctx, `
		UPDATE arena_match_players
		SET suspicion_count = suspicion_count + 1,
		    last_suspicion_reason = $3,
		    last_suspicion_at = NOW(),
		    updated_at = NOW()
		WHERE match_id = $1 AND user_id = $2
	`, matchID, userID, reason)
	if err != nil {
		return fmt.Errorf("report arena suspicion: %w", err)
	}

	if res.RowsAffected() == 0 {
		return fmt.Errorf("report arena suspicion: player %s is not in match %s", userID, matchID)
	}

	// Just update suspicion count, don't mark match unrated here
	// Service layer will handle 2-strike logic
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit report arena suspicion tx: %w", err)
	}

	return nil
}

func (r *Repo) ApplyAntiCheatPenalty(ctx context.Context, matchID, userID uuid.UUID, delta int32, reason string) error {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin anti-cheat penalty tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var alreadyPenalized bool
	var isRegistered bool

	if err := tx.QueryRow(ctx, `
		SELECT p.anti_cheat_penalized, (u.id IS NOT NULL) AS is_registered
		FROM arena_match_players p
		LEFT JOIN users u ON u.id = p.user_id
		WHERE p.match_id = $1 AND p.user_id = $2
		FOR UPDATE
	`, matchID, userID).Scan(&alreadyPenalized, &isRegistered); err != nil {
		return fmt.Errorf("load anti-cheat penalty state: %w", err)
	}

	if alreadyPenalized {
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit anti-cheat penalty noop: %w", err)
		}
		return nil
	}

	if _, err := tx.Exec(ctx, `
		UPDATE arena_match_players
		SET anti_cheat_penalized = TRUE,
		    updated_at = NOW()
		WHERE match_id = $1 AND user_id = $2
	`, matchID, userID); err != nil {
		return fmt.Errorf("mark anti-cheat penalized: %w", err)
	}

	if isRegistered {
		if _, err := tx.Exec(ctx, `
			INSERT INTO arena_player_stats (user_id, display_name, rating, wins, losses, matches, best_runtime_ms, updated_at)
			SELECT p.user_id, p.display_name, GREATEST(100, $3), 0, 0, 0, 0, NOW()
			FROM arena_match_players p
			WHERE p.match_id = $1 AND p.user_id = $2
			ON CONFLICT (user_id) DO UPDATE SET
			  rating = GREATEST(100, arena_player_stats.rating + $3),
			  updated_at = NOW()
		`, matchID, userID, delta); err != nil {
			return fmt.Errorf("apply arena anti-cheat rating penalty: %w", err)
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO arena_rating_penalties (id, match_id, user_id, reason, delta_rating, created_at)
			VALUES ($1, $2, $3, $4, $5, NOW())
			ON CONFLICT DO NOTHING
		`, uuid.New(), matchID, userID, reason, delta); err != nil {
			return fmt.Errorf("create arena rating penalty history: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anti-cheat penalty: %w", err)
	}

	return nil
}

func (r *Repo) CreateRatingPenalty(ctx context.Context, penalty *domain.RatingPenalty) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO arena_rating_penalties (id, match_id, user_id, reason, delta_rating, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT DO NOTHING
	`, penalty.ID, penalty.MatchID, penalty.UserID, penalty.Reason, penalty.DeltaRating, penalty.CreatedAt)
	if err != nil {
		return fmt.Errorf("create arena rating penalty: %w", err)
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

func (r *Repo) GetPlayer(ctx context.Context, matchID, userID uuid.UUID) (*domain.Player, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT p.match_id, p.user_id, p.display_name, p.side, p.is_creator,
		       p.freeze_until, p.accepted_at, p.best_runtime_ms, p.is_winner,
		       p.suspicion_count, p.anti_cheat_penalized, p.joined_at, p.updated_at, p.current_code
		FROM arena_match_players p
		WHERE p.match_id = $1 AND p.user_id = $2
	`, matchID, userID)

	var player domain.Player
	var freezeUntil, acceptedAt pgtype.Timestamptz
	var updatedAt, joinedAt pgtype.Timestamptz
	err := row.Scan(
		&player.MatchID,
		&player.UserID,
		&player.DisplayName,
		&player.Side,
		&player.IsCreator,
		&freezeUntil,
		&acceptedAt,
		&player.BestRuntimeMs,
		&player.IsWinner,
		&player.SuspicionCount,
		&player.AntiCheatPenalized,
		&joinedAt,
		&updatedAt,
		&player.CurrentCode,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get arena player: %w", err)
	}

	if freezeUntil.Valid {
		player.FreezeUntil = &freezeUntil.Time
	}
	if acceptedAt.Valid {
		player.AcceptedAt = &acceptedAt.Time
	}
	player.JoinedAt = joinedAt.Time
	player.UpdatedAt = updatedAt.Time

	return &player, nil
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

func (r *Repo) GetPlayerStatsBatch(ctx context.Context, userIDs []uuid.UUID) (map[uuid.UUID]*domain.PlayerStats, error) {
	if len(userIDs) == 0 {
		return make(map[uuid.UUID]*domain.PlayerStats), nil
	}

	userIDStrings := make([]string, 0, len(userIDs))
	for _, id := range userIDs {
		userIDStrings = append(userIDStrings, id.String())
	}

	rows, err := r.data.DB.Query(ctx, leaderboardSelect+`
		WHERE aps.user_id = ANY($1)
	`, userIDStrings)
	if err != nil {
		return nil, fmt.Errorf("get arena player stats batch: %w", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID]*domain.PlayerStats, len(userIDs))
	for rows.Next() {
		var item domain.PlayerStats
		if err := scanPlayerStats(rows, &item); err != nil {
			return nil, fmt.Errorf("scan arena player stats batch: %w", err)
		}
		item.League = arenaLeague(item.Rating)
		parsedUserID, err := uuid.Parse(item.UserID)
		if err != nil {
			return nil, fmt.Errorf("parse arena player stats user id %q: %w", item.UserID, err)
		}
		result[parsedUserID] = &item
	}
	return result, nil
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
