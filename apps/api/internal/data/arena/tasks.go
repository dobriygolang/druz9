package arena

import (
	"context"
	"errors"
	"fmt"

	"api/internal/data/codetasks"
	domain "api/internal/domain/arena"
	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) PickRandomTask(ctx context.Context, topic, difficulty string) (*domain.Task, error) {
	difficultyValue := model.TaskDifficultyFromString(difficulty)
	var task domain.Task
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
