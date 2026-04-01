package interviewprep

import (
	"context"
	"errors"
	"fmt"

	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) ListQuestionsByTask(ctx context.Context, taskID uuid.UUID) ([]*model.InterviewPrepQuestion, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, task_id, position, prompt, answer, created_at, updated_at
		FROM interview_prep_questions
		WHERE task_id = $1
		ORDER BY position ASC
	`, taskID)
	if err != nil {
		return nil, fmt.Errorf("list interview prep questions: %w", err)
	}
	defer rows.Close()

	var items []*model.InterviewPrepQuestion
	for rows.Next() {
		item, err := scanQuestion(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) GetQuestionByID(ctx context.Context, questionID uuid.UUID) (*model.InterviewPrepQuestion, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT id, task_id, position, prompt, answer, created_at, updated_at
		FROM interview_prep_questions
		WHERE id = $1
	`, questionID)

	item, err := scanQuestion(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get interview prep question: %w", err)
	}
	return item, nil
}

func (r *Repo) GetQuestionByTaskAndPosition(ctx context.Context, taskID uuid.UUID, position int32) (*model.InterviewPrepQuestion, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT id, task_id, position, prompt, answer, created_at, updated_at
		FROM interview_prep_questions
		WHERE task_id = $1 AND position = $2
	`, taskID, position)

	item, err := scanQuestion(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get interview prep question by position: %w", err)
	}
	return item, nil
}

func (r *Repo) CreateQuestion(ctx context.Context, question *model.InterviewPrepQuestion) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO interview_prep_questions (
			id, task_id, position, prompt, answer, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
	`,
		question.ID,
		question.TaskID,
		question.Position,
		question.Prompt,
		question.Answer,
		question.CreatedAt,
		question.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create interview prep question: %w", err)
	}
	return nil
}

func (r *Repo) UpdateQuestion(ctx context.Context, question *model.InterviewPrepQuestion) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_questions
		SET position = $2,
		    prompt = $3,
		    answer = $4,
		    updated_at = NOW()
		WHERE id = $1
	`,
		question.ID,
		question.Position,
		question.Prompt,
		question.Answer,
	)
	if err != nil {
		return fmt.Errorf("update interview prep question: %w", err)
	}
	return nil
}

func (r *Repo) DeleteQuestion(ctx context.Context, questionID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `
		DELETE FROM interview_prep_questions WHERE id = $1
	`, questionID)
	if err != nil {
		return fmt.Errorf("delete interview prep question: %w", err)
	}
	return nil
}
