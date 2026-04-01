package interviewprep

import (
	"context"
	"errors"
	"fmt"

	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) ListActiveTasks(ctx context.Context) ([]*model.InterviewPrepTask, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, slug, title, statement, prep_type, language, company_tag, supported_languages, is_executable,
		       execution_profile, runner_mode, duration_seconds, starter_code,
		       reference_solution, code_task_id, is_active, created_at, updated_at
		FROM interview_prep_tasks
		WHERE is_active = TRUE
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list interview prep tasks: %w", err)
	}
	defer rows.Close()

	var items []*model.InterviewPrepTask
	for rows.Next() {
		item, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) GetTask(ctx context.Context, taskID uuid.UUID) (*model.InterviewPrepTask, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT id, slug, title, statement, prep_type, language, company_tag, supported_languages, is_executable,
		       execution_profile, runner_mode, duration_seconds, starter_code,
		       reference_solution, code_task_id, is_active, created_at, updated_at
		FROM interview_prep_tasks
		WHERE id = $1
	`, taskID)

	item, err := scanTask(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get interview prep task: %w", err)
	}
	return item, nil
}

func (r *Repo) ListAllTasks(ctx context.Context) ([]*model.InterviewPrepTask, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, slug, title, statement, prep_type, language, company_tag, supported_languages, is_executable,
		       execution_profile, runner_mode, duration_seconds, starter_code,
		       reference_solution, code_task_id, is_active, created_at, updated_at
		FROM interview_prep_tasks
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list all interview prep tasks: %w", err)
	}
	defer rows.Close()

	var items []*model.InterviewPrepTask
	for rows.Next() {
		item, err := scanTask(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreateTask(ctx context.Context, task *model.InterviewPrepTask) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO interview_prep_tasks (
			id, slug, title, statement, prep_type, language, company_tag, supported_languages, is_executable,
			execution_profile, runner_mode, duration_seconds, starter_code,
			reference_solution, code_task_id, is_active, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
	`,
		task.ID,
		task.Slug,
		task.Title,
		task.Statement,
		task.PrepType.String(),
		task.Language,
		task.CompanyTag,
		task.SupportedLanguages,
		task.IsExecutable,
		task.ExecutionProfile,
		task.RunnerMode,
		task.DurationSeconds,
		task.StarterCode,
		task.ReferenceSolution,
		task.CodeTaskID,
		task.IsActive,
		task.CreatedAt,
		task.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create interview prep task: %w", err)
	}
	return nil
}

func (r *Repo) UpdateTask(ctx context.Context, task *model.InterviewPrepTask) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_tasks
		SET slug = $2,
		    title = $3,
		    statement = $4,
		    prep_type = $5,
		    language = $6,
		    company_tag = $7,
		    supported_languages = $8,
		    is_executable = $9,
		    execution_profile = $10,
		    runner_mode = $11,
		    duration_seconds = $12,
		    starter_code = $13,
		    reference_solution = $14,
		    code_task_id = $15,
		    is_active = $16,
		    updated_at = NOW()
		WHERE id = $1
	`,
		task.ID,
		task.Slug,
		task.Title,
		task.Statement,
		task.PrepType.String(),
		task.Language,
		task.CompanyTag,
		task.SupportedLanguages,
		task.IsExecutable,
		task.ExecutionProfile,
		task.RunnerMode,
		task.DurationSeconds,
		task.StarterCode,
		task.ReferenceSolution,
		task.CodeTaskID,
		task.IsActive,
	)
	if err != nil {
		return fmt.Errorf("update interview prep task: %w", err)
	}
	return nil
}

func (r *Repo) DeleteTask(ctx context.Context, taskID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `
		DELETE FROM interview_prep_tasks WHERE id = $1
	`, taskID)
	if err != nil {
		return fmt.Errorf("delete interview prep task: %w", err)
	}
	return nil
}
