package code_editor

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"api/internal/data/codetasks"
	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/model"
	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const roomColumns = `
	id, mode, code, code_revision, status, creator_id, invite_code,
	COALESCE(task, ''), task_id, COALESCE(duel_topic, ''),
	winner_user_id, COALESCE(winner_guest_name, ''), started_at, finished_at, created_at, updated_at
`

type scanner interface {
	Scan(dest ...any) error
}

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(dataLayer *postgres.Store, logger log.Logger) codeeditordomain.Repository {
	return &Repo{
		data: dataLayer,
		log:  log.NewHelper(logger),
	}
}

func (r *Repo) CreateRoom(ctx context.Context, room *codeeditordomain.Room) (*codeeditordomain.Room, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(
		ctx,
		`INSERT INTO code_rooms (id, mode, code, code_revision, status, creator_id, invite_code, task, task_id, duel_topic, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
		room.ID, room.Mode, room.Code, room.CodeRevision, room.Status, room.CreatorID, room.InviteCode, room.Task, room.TaskID, room.DuelTopic,
	)
	if err != nil {
		return nil, fmt.Errorf("insert room: %w", err)
	}

	// Insert creator as first participant
	if len(room.Participants) > 0 {
		p := room.Participants[0]
		_, err = tx.Exec(
			ctx,
			`INSERT INTO code_participants (room_id, user_id, name, is_guest, is_ready, is_winner, joined_at)
			 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
			room.ID, p.UserID, p.Name, p.IsGuest, p.IsReady, p.IsWinner,
		)
		if err != nil {
			return nil, fmt.Errorf("insert participant: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return r.GetRoom(ctx, room.ID)
}

func (r *Repo) GetRoom(ctx context.Context, roomID uuid.UUID) (*codeeditordomain.Room, error) {
	var room codeeditordomain.Room
	err := scanRoom(r.data.DB.QueryRow(ctx, `
		SELECT `+roomColumns+`
		FROM code_rooms
		WHERE id = $1
	`, roomID), &room)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, codeeditordomain.ErrRoomNotFound
		}
		// Ignore context canceled - happens with polling
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, codeeditordomain.ErrRoomNotFound
		}
		return nil, fmt.Errorf("get room: %w", err)
	}
	room.Participants, _ = r.getParticipants(ctx, roomID)
	return &room, nil
}

func (r *Repo) GetRoomByInviteCode(ctx context.Context, inviteCode string) (*codeeditordomain.Room, error) {
	var room codeeditordomain.Room
	err := scanRoom(r.data.DB.QueryRow(ctx, `
		SELECT `+roomColumns+`
		FROM code_rooms
		WHERE invite_code = $1
	`, inviteCode), &room)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, codeeditordomain.ErrRoomNotFound
		}
		// Ignore context canceled - happens with polling
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, codeeditordomain.ErrRoomNotFound
		}
		return nil, fmt.Errorf("get room by invite code: %w", err)
	}
	room.Participants, _ = r.getParticipants(ctx, room.ID)
	return &room, nil
}

func (r *Repo) getParticipants(ctx context.Context, roomID uuid.UUID) ([]*codeeditordomain.Participant, error) {
	rows, err := r.data.DB.Query(ctx, `SELECT user_id, name, is_guest, is_ready, is_winner, joined_at FROM code_participants WHERE room_id = $1`, roomID)
	if err != nil {
		return nil, fmt.Errorf("get participants: %w", err)
	}
	defer rows.Close()

	var participants []*codeeditordomain.Participant
	for rows.Next() {
		var p codeeditordomain.Participant
		if err := scanParticipant(rows, &p); err != nil {
			return nil, fmt.Errorf("scan participant: %w", err)
		}
		participants = append(participants, &p)
	}
	return participants, nil
}

func (r *Repo) SaveCodeSnapshot(ctx context.Context, roomID uuid.UUID, code string) error {
	_, err := r.data.DB.Exec(
		ctx,
		`UPDATE code_rooms
		 SET code = $2, code_revision = code_revision + 1, updated_at = NOW()
		 WHERE id = $1`,
		roomID, code,
	)
	if err != nil {
		return fmt.Errorf("save code snapshot: %w", err)
	}
	return nil
}

func (r *Repo) UpdateRoomStatus(ctx context.Context, roomID uuid.UUID, status model.RoomStatus) error {
	_, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET status = $2, updated_at = NOW() WHERE id = $1`, roomID, status)
	if err != nil {
		return fmt.Errorf("update room status: %w", err)
	}
	return nil
}

func (r *Repo) AddParticipant(ctx context.Context, roomID uuid.UUID, participant *codeeditordomain.Participant) (*codeeditordomain.Room, error) {
	// First try to update existing participant
	if participant.UserID != nil {
		_, err := r.data.DB.Exec(
			ctx,
			`UPDATE code_participants SET name = $3, is_guest = $4 WHERE room_id = $1 AND user_id = $2`,
			roomID, participant.UserID, participant.Name, participant.IsGuest,
		)
		if err != nil {
			return nil, fmt.Errorf("update participant: %w", err)
		}

		// If no row was updated, insert new participant
		rows, err := r.data.DB.Exec(
			ctx,
			`INSERT INTO code_participants (room_id, user_id, name, is_guest, is_ready, is_winner, joined_at)
			 VALUES ($1, $2, $3, $4, $5, $6, NOW())
			 ON CONFLICT DO NOTHING`,
			roomID, participant.UserID, participant.Name, participant.IsGuest, participant.IsReady, participant.IsWinner,
		)
		if err != nil {
			return nil, fmt.Errorf("add participant: %w", err)
		}
		_ = rows
	} else {
		// For guests, use name-based upsert
		_, err := r.data.DB.Exec(
			ctx,
			`INSERT INTO code_participants (room_id, user_id, name, is_guest, is_ready, is_winner, joined_at)
			 VALUES ($1, $2, $3, $4, $5, $6, NOW())
			 ON CONFLICT (room_id, name) WHERE is_guest = true DO UPDATE SET is_guest = EXCLUDED.is_guest`,
			roomID, participant.UserID, participant.Name, participant.IsGuest, participant.IsReady, participant.IsWinner,
		)
		if err != nil {
			return nil, fmt.Errorf("add participant: %w", err)
		}
	}

	if _, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET updated_at = NOW() WHERE id = $1`, roomID); err != nil {
		return nil, fmt.Errorf("touch room after add participant: %w", err)
	}

	return r.GetRoom(ctx, roomID)
}

func (r *Repo) RemoveParticipant(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) error {
	var err error
	if userID != nil {
		_, err = r.data.DB.Exec(ctx, `DELETE FROM code_participants WHERE room_id = $1 AND user_id = $2`, roomID, userID)
	} else {
		_, err = r.data.DB.Exec(ctx, `DELETE FROM code_participants WHERE room_id = $1 AND name = $2 AND is_guest = true`, roomID, guestName)
	}
	if err != nil {
		return fmt.Errorf("remove participant: %w", err)
	}
	if _, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET updated_at = NOW() WHERE id = $1`, roomID); err != nil {
		return fmt.Errorf("touch room after remove participant: %w", err)
	}
	return nil
}

func (r *Repo) SetParticipantReady(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, ready bool) error {
	var err error
	if userID != nil {
		_, err = r.data.DB.Exec(ctx, `UPDATE code_participants SET is_ready = $3 WHERE room_id = $1 AND user_id = $2`, roomID, userID, ready)
	} else {
		_, err = r.data.DB.Exec(ctx, `UPDATE code_participants SET is_ready = $3 WHERE room_id = $1 AND name = $2 AND is_guest = true`, roomID, guestName, ready)
	}
	if err != nil {
		return fmt.Errorf("set participant ready: %w", err)
	}
	if _, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET updated_at = NOW() WHERE id = $1`, roomID); err != nil {
		return fmt.Errorf("touch room after ready: %w", err)
	}
	return nil
}

func (r *Repo) SetWinner(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) error {
	// Reset all winners first
	_, err := r.data.DB.Exec(ctx, `UPDATE code_participants SET is_winner = false WHERE room_id = $1`, roomID)
	if err != nil {
		return fmt.Errorf("reset winners: %w", err)
	}

	// Set winner
	if userID != nil {
		_, err = r.data.DB.Exec(ctx, `UPDATE code_participants SET is_winner = true WHERE room_id = $1 AND user_id = $2`, roomID, userID)
	} else {
		_, err = r.data.DB.Exec(ctx, `UPDATE code_participants SET is_winner = true WHERE room_id = $1 AND name = $2 AND is_guest = true`, roomID, guestName)
	}
	if err != nil {
		return fmt.Errorf("set winner: %w", err)
	}
	if _, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET updated_at = NOW() WHERE id = $1`, roomID); err != nil {
		return fmt.Errorf("touch room after winner: %w", err)
	}
	return nil
}

func (r *Repo) CreateSubmission(ctx context.Context, submission *codeeditordomain.Submission) (*codeeditordomain.Submission, error) {
	_, err := r.data.DB.Exec(
		ctx,
		`INSERT INTO code_submissions (id, room_id, user_id, guest_name, code, output, error, submitted_at, duration_ms, is_correct, passed_count, total_count)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11)`,
		submission.ID, submission.RoomID, submission.UserID, submission.GuestName, submission.Code, submission.Output, submission.Error, submission.DurationMs, submission.IsCorrect, submission.PassedCount, submission.TotalCount,
	)
	if err != nil {
		return nil, fmt.Errorf("create submission: %w", err)
	}
	if _, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET updated_at = NOW() WHERE id = $1`, submission.RoomID); err != nil {
		return nil, fmt.Errorf("touch room after submission: %w", err)
	}
	return submission, nil
}

func (r *Repo) GetSubmissions(ctx context.Context, roomID uuid.UUID) ([]*codeeditordomain.Submission, error) {
	rows, err := r.data.DB.Query(ctx, `SELECT id, room_id, user_id, guest_name, code, output, error, submitted_at, duration_ms, is_correct, passed_count, total_count FROM code_submissions WHERE room_id = $1 ORDER BY submitted_at ASC`, roomID)
	if err != nil {
		return nil, fmt.Errorf("get submissions: %w", err)
	}
	defer rows.Close()

	var submissions []*codeeditordomain.Submission
	for rows.Next() {
		var s codeeditordomain.Submission
		if err := scanSubmission(rows, &s); err != nil {
			return nil, fmt.Errorf("scan submission: %w", err)
		}
		submissions = append(submissions, &s)
	}
	return submissions, nil
}

func (r *Repo) StartDuel(ctx context.Context, roomID uuid.UUID, startedAt time.Time) error {
	_, err := r.data.DB.Exec(ctx, `UPDATE code_rooms SET status = $2, started_at = $3, updated_at = NOW() WHERE id = $1`, roomID, codeeditordomain.RoomStatusActive, startedAt)
	if err != nil {
		return fmt.Errorf("start duel: %w", err)
	}
	return nil
}

func (r *Repo) FinishDuel(ctx context.Context, roomID uuid.UUID, winnerUserID *uuid.UUID, winnerGuestName string, finishedAt time.Time) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE code_rooms
		SET status = $2, winner_user_id = $3, winner_guest_name = $4, finished_at = $5, updated_at = NOW()
		WHERE id = $1
	`, roomID, codeeditordomain.RoomStatusFinished, winnerUserID, winnerGuestName, finishedAt)
	if err != nil {
		return fmt.Errorf("finish duel: %w", err)
	}
	return nil
}

func (r *Repo) ListTasks(ctx context.Context, filter codeeditordomain.TaskFilter) ([]*codeeditordomain.Task, error) {
	difficulty := difficultyFilterValue(filter.Difficulty)
	query := `
		SELECT ` + codetasks.SelectColumns + `
		FROM code_tasks
		WHERE ($1 = '' OR $1 = ANY(topics))
		  AND ($2 = 0 OR difficulty = $2)
		  AND ($3 OR is_active = TRUE)
		ORDER BY created_at DESC
	`
	rows, err := r.data.DB.Query(ctx, query, filter.Topic, difficulty, filter.IncludeInactive)
	if err != nil {
		return nil, fmt.Errorf("list tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*codeeditordomain.Task
	for rows.Next() {
		var task codeeditordomain.Task
		if err := codetasks.ScanTask(rows, &task); err != nil {
			return nil, fmt.Errorf("scan task: %w", err)
		}
		tasks = append(tasks, &task)
	}

	// Batch load test cases in single query (O(1) instead of O(n) queries)
	if len(tasks) > 0 {
		if err := codetasks.LoadCasesMultiple(ctx, r.data.DB, tasks); err != nil {
			return nil, err
		}
	}
	return tasks, nil
}

func (r *Repo) CreateTask(ctx context.Context, task *codeeditordomain.Task) (*codeeditordomain.Task, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin create task tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		INSERT INTO code_tasks (id, title, slug, statement, difficulty, topics, starter_code, language, task_type, execution_profile, runner_mode, fixture_files, readable_paths, writable_paths, allowed_hosts, allowed_ports, mock_endpoints, writable_temp_dir, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
	`, task.ID, task.Title, task.Slug, task.Statement, task.Difficulty, task.Topics, task.StarterCode, task.Language, task.TaskType, task.ExecutionProfile.String(), task.RunnerMode, task.FixtureFiles, task.ReadablePaths, task.WritablePaths, task.AllowedHosts, task.AllowedPorts, task.MockEndpoints, task.WritableTempDir, task.IsActive)
	if err != nil {
		return nil, fmt.Errorf("insert task: %w", err)
	}
	if err := r.insertTaskCases(ctx, tx, task); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit create task tx: %w", err)
	}
	return r.GetTask(ctx, task.ID)
}

func (r *Repo) UpdateTask(ctx context.Context, task *codeeditordomain.Task) (*codeeditordomain.Task, error) {
	tx, err := r.data.DB.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin update task tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		UPDATE code_tasks
		SET title = $2, slug = $3, statement = $4, difficulty = $5, topics = $6, starter_code = $7, language = $8, task_type = $9, execution_profile = $10, runner_mode = $11, fixture_files = $12, readable_paths = $13, writable_paths = $14, allowed_hosts = $15, allowed_ports = $16, mock_endpoints = $17, writable_temp_dir = $18, is_active = $19, updated_at = NOW()
		WHERE id = $1
	`, task.ID, task.Title, task.Slug, task.Statement, task.Difficulty, task.Topics, task.StarterCode, task.Language, task.TaskType, task.ExecutionProfile.String(), task.RunnerMode, task.FixtureFiles, task.ReadablePaths, task.WritablePaths, task.AllowedHosts, task.AllowedPorts, task.MockEndpoints, task.WritableTempDir, task.IsActive)
	if err != nil {
		return nil, fmt.Errorf("update task: %w", err)
	}
	if _, err := tx.Exec(ctx, `DELETE FROM code_task_test_cases WHERE task_id = $1`, task.ID); err != nil {
		return nil, fmt.Errorf("delete old task cases: %w", err)
	}
	if err := r.insertTaskCases(ctx, tx, task); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit update task tx: %w", err)
	}
	return r.GetTask(ctx, task.ID)
}

func (r *Repo) DeleteTask(ctx context.Context, taskID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `DELETE FROM code_tasks WHERE id = $1`, taskID)
	if err != nil {
		return fmt.Errorf("delete task: %w", err)
	}
	return nil
}

func (r *Repo) GetTask(ctx context.Context, taskID uuid.UUID) (*codeeditordomain.Task, error) {
	var task codeeditordomain.Task
	err := codetasks.ScanTask(r.data.DB.QueryRow(ctx, `
		SELECT `+codetasks.SelectColumns+`
		FROM code_tasks
		WHERE id = $1
	`, taskID), &task)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, codeeditordomain.ErrTaskNotFound
		}
		return nil, fmt.Errorf("get task: %w", err)
	}
	if err := codetasks.LoadCasesMultiple(ctx, r.data.DB, []*codeeditordomain.Task{&task}); err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *Repo) PickRandomTask(ctx context.Context, topic, difficulty string) (*codeeditordomain.Task, error) {
	difficultyValue := difficultyFilterValue(difficulty)
	var task codeeditordomain.Task
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
			return nil, codeeditordomain.ErrNoAvailableTasks
		}
		return nil, fmt.Errorf("pick random task: %w", err)
	}
	if err := codetasks.LoadCasesMultiple(ctx, r.data.DB, []*codeeditordomain.Task{&task}); err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *Repo) GetLeaderboard(ctx context.Context, limit int32) ([]*codeeditordomain.LeaderboardEntry, error) {
	if limit <= 0 {
		limit = 20
	}

	rows, err := r.data.DB.Query(ctx, `
		WITH duel_rooms AS (
			SELECT id, winner_user_id, winner_guest_name
			FROM code_rooms
			WHERE mode = $1 AND status = $2
		),
		match_participants AS (
			SELECT
				cp.room_id,
				COALESCE(cp.user_id::text, 'guest:' || cp.name) AS actor_id,
				COALESCE(NULLIF(cp.name, ''), 'Гость') AS display_name,
				CASE
					WHEN cp.user_id IS NOT NULL AND cp.user_id = dr.winner_user_id THEN 1
					WHEN cp.user_id IS NULL AND cp.name = dr.winner_guest_name THEN 1
					ELSE 0
				END AS is_win
			FROM code_participants cp
			JOIN duel_rooms dr ON dr.id = cp.room_id
		),
		best_times AS (
			SELECT
				COALESCE(user_id::text, 'guest:' || guest_name) AS actor_id,
				MIN(duration_ms) FILTER (WHERE is_correct = TRUE) AS best_solve_ms
			FROM code_submissions
			GROUP BY 1
		)
		SELECT
			mp.actor_id,
			mp.display_name,
			SUM(mp.is_win)::int AS wins,
			COUNT(*)::int AS matches,
			CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(mp.is_win)::float8 / COUNT(*)::float8 END AS win_rate,
			COALESCE(bt.best_solve_ms, 0)::bigint AS best_solve_ms
		FROM match_participants mp
		LEFT JOIN best_times bt ON bt.actor_id = mp.actor_id
		GROUP BY mp.actor_id, mp.display_name, bt.best_solve_ms
		ORDER BY wins DESC, win_rate DESC, best_solve_ms ASC
		LIMIT $3
	`, model.RoomModeDuel, model.RoomStatusFinished, limit)
	if err != nil {
		return nil, fmt.Errorf("get leaderboard: %w", err)
	}
	defer rows.Close()

	var entries []*codeeditordomain.LeaderboardEntry
	for rows.Next() {
		var entry codeeditordomain.LeaderboardEntry
		if err := rows.Scan(&entry.UserID, &entry.DisplayName, &entry.Wins, &entry.Matches, &entry.WinRate, &entry.BestSolveMs); err != nil {
			return nil, fmt.Errorf("scan leaderboard: %w", err)
		}
		entries = append(entries, &entry)
	}
	return entries, nil
}

func (r *Repo) insertTaskCases(ctx context.Context, tx pgx.Tx, task *codeeditordomain.Task) error {
	// Collect all test cases
	var allCases []*codeeditordomain.TestCase
	for _, tc := range task.PublicTestCases {
		tc.TaskID = task.ID
		tc.IsPublic = true
		if tc.ID == uuid.Nil {
			tc.ID = uuid.New()
		}
		allCases = append(allCases, tc)
	}
	for _, tc := range task.HiddenTestCases {
		tc.TaskID = task.ID
		tc.IsPublic = false
		if tc.ID == uuid.Nil {
			tc.ID = uuid.New()
		}
		allCases = append(allCases, tc)
	}

	if len(allCases) == 0 {
		return nil
	}

	// Batch insert using single query with multiple value sets
	// Build the query dynamically based on number of cases
	values := make([]string, 0, len(allCases))
	args := make([]any, 0, len(allCases)*7)
	for i, tc := range allCases {
		offset := i * 7
		values = append(values, fmt.Sprintf("($%d, $%d, $%d, $%d, $%d, $%d, $%d)",
			offset+1, offset+2, offset+3, offset+4, offset+5, offset+6, offset+7))
		args = append(args, tc.ID, tc.TaskID, tc.Input, tc.ExpectedOutput, tc.IsPublic, tc.Weight, tc.Order)
	}

	query := fmt.Sprintf(`
		INSERT INTO code_task_test_cases (id, task_id, input, expected_output, is_public, weight, "order")
		VALUES %s
	`, strings.Join(values, ", "))

	_, err := tx.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("insert task cases batch: %w", err)
	}
	return nil
}

func (r *Repo) CleanupInactiveRooms(ctx context.Context, idleFor time.Duration) (int64, error) {
	tag, err := r.data.DB.Exec(ctx, `
		DELETE FROM code_rooms cr
		WHERE cr.status IN ($1, $2)
		  AND cr.mode IN ($3, $4)
		  AND cr.updated_at < NOW() - $5::interval
	`, model.RoomStatusWaiting, model.RoomStatusFinished, model.RoomModeAll, model.RoomModeDuel, idleFor.String())
	if err != nil {
		return 0, fmt.Errorf("cleanup inactive rooms: %w", err)
	}
	return tag.RowsAffected(), nil
}

func difficultyFilterValue(raw string) model.TaskDifficulty {
	return model.TaskDifficultyFromString(raw)
}

func scanRoom(row scanner, room *codeeditordomain.Room) error {
	return row.Scan(
		&room.ID,
		&room.Mode,
		&room.Code,
		&room.CodeRevision,
		&room.Status,
		&room.CreatorID,
		&room.InviteCode,
		&room.Task,
		&room.TaskID,
		&room.DuelTopic,
		&room.WinnerUserID,
		&room.WinnerGuest,
		&room.StartedAt,
		&room.FinishedAt,
		&room.CreatedAt,
		&room.UpdatedAt,
	)
}

func scanParticipant(row scanner, participant *codeeditordomain.Participant) error {
	return row.Scan(
		&participant.UserID,
		&participant.Name,
		&participant.IsGuest,
		&participant.IsReady,
		&participant.IsWinner,
		&participant.JoinedAt,
	)
}

func scanSubmission(row scanner, submission *codeeditordomain.Submission) error {
	return row.Scan(
		&submission.ID,
		&submission.RoomID,
		&submission.UserID,
		&submission.GuestName,
		&submission.Code,
		&submission.Output,
		&submission.Error,
		&submission.SubmittedAt,
		&submission.DurationMs,
		&submission.IsCorrect,
		&submission.PassedCount,
		&submission.TotalCount,
	)
}
