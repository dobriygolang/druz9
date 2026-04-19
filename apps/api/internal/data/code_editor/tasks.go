package code_editor

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/data/codetasks"
	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/model"
)

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
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate task rows: %w", err)
	}

	if len(tasks) > 0 {
		if err := codetasks.LoadCasesMultiple(ctx, r.data.DB, tasks); err != nil {
			return nil, fmt.Errorf("load task cases: %w", err)
		}
	}
	return tasks, nil
}

func (r *Repo) ListSolvedTasks(ctx context.Context, userID uuid.UUID) ([]*codeeditordomain.Task, error) {
	query := `
		SELECT DISTINCT ON (ct.id) ` + codetasks.SelectColumns + `
		FROM code_submissions cs
		INNER JOIN code_rooms cr ON cr.id = cs.room_id
		INNER JOIN code_tasks ct ON ct.id = cr.task_id
		WHERE cs.user_id = $1
		  AND cs.is_correct = TRUE
		  AND ct.is_active = TRUE
		ORDER BY ct.id, cs.submitted_at DESC
	`
	rows, err := r.data.DB.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("list solved tasks: %w", err)
	}
	defer rows.Close()

	var tasks []*codeeditordomain.Task
	for rows.Next() {
		var task codeeditordomain.Task
		if err := codetasks.ScanTask(rows, &task); err != nil {
			return nil, fmt.Errorf("scan solved task: %w", err)
		}
		tasks = append(tasks, &task)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate solved tasks: %w", err)
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
		return nil, fmt.Errorf("load task cases: %w", err)
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
		  AND task_type = $3
		  AND execution_profile = $4
		ORDER BY random()
		LIMIT 1
	`, topic, difficultyValue, model.TaskTypeAlgorithm, model.ExecutionProfilePure.String()), &task)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, codeeditordomain.ErrNoAvailableTasks
		}
		return nil, fmt.Errorf("pick random task: %w", err)
	}
	if err := codetasks.LoadCasesMultiple(ctx, r.data.DB, []*codeeditordomain.Task{&task}); err != nil {
		return nil, fmt.Errorf("load task cases: %w", err)
	}
	return &task, nil
}

func (r *Repo) insertTaskCases(ctx context.Context, tx pgx.Tx, task *codeeditordomain.Task) error {
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

func difficultyFilterValue(raw string) model.TaskDifficulty {
	return model.TaskDifficultyFromString(raw)
}
