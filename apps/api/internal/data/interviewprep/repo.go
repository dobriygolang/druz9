package interviewprep

import (
	"context"
	"errors"
	"fmt"

	"api/internal/model"
	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func New(dataLayer *postgres.Store, logger log.Logger) *Repo {
	return &Repo{
		data: dataLayer,
		log:  log.NewHelper(logger),
	}
}

type scanner interface {
	Scan(dest ...any) error
}

func (r *Repo) ListActiveTasks(ctx context.Context) ([]*model.InterviewPrepTask, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, slug, title, statement, prep_type, language, is_executable,
		       execution_profile, runner_mode, duration_seconds, starter_code,
		       reference_solution, is_active, created_at, updated_at
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
		SELECT id, slug, title, statement, prep_type, language, is_executable,
		       execution_profile, runner_mode, duration_seconds, starter_code,
		       reference_solution, is_active, created_at, updated_at
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

func (r *Repo) CreateSession(ctx context.Context, session *model.InterviewPrepSession) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO interview_prep_sessions (
			id, user_id, task_id, status, current_question_position, code,
			last_submission_passed, started_at, finished_at, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	`,
		session.ID,
		session.UserID,
		session.TaskID,
		session.Status.String(),
		session.CurrentQuestionPosition,
		session.Code,
		session.LastSubmissionPassed,
		session.StartedAt,
		session.FinishedAt,
		session.CreatedAt,
		session.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create interview prep session: %w", err)
	}
	return nil
}

func (r *Repo) GetSession(ctx context.Context, sessionID uuid.UUID) (*model.InterviewPrepSession, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT id, user_id, task_id, status, current_question_position, code,
		       last_submission_passed, started_at, finished_at, created_at, updated_at
		FROM interview_prep_sessions
		WHERE id = $1
	`, sessionID)

	item, err := scanSession(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get interview prep session: %w", err)
	}
	return item, nil
}

func (r *Repo) GetActiveSessionByUserAndTask(ctx context.Context, userID, taskID uuid.UUID) (*model.InterviewPrepSession, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT id, user_id, task_id, status, current_question_position, code,
		       last_submission_passed, started_at, finished_at, created_at, updated_at
		FROM interview_prep_sessions
		WHERE user_id = $1 AND task_id = $2 AND status = $3
		ORDER BY updated_at DESC
		LIMIT 1
	`, userID, taskID, model.InterviewPrepSessionStatusActive)

	item, err := scanSession(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get active interview prep session: %w", err)
	}
	return item, nil
}

func (r *Repo) UpdateSessionCode(ctx context.Context, sessionID uuid.UUID, code string, passed bool) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_sessions
		SET code = $2,
		    last_submission_passed = $3,
		    updated_at = NOW()
		WHERE id = $1
	`, sessionID, code, passed)
	if err != nil {
		return fmt.Errorf("update interview prep session code: %w", err)
	}
	return nil
}

func (r *Repo) AdvanceSessionQuestion(ctx context.Context, sessionID uuid.UUID, nextPosition int32) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_sessions
		SET current_question_position = $2,
		    updated_at = NOW()
		WHERE id = $1
	`, sessionID, nextPosition)
	if err != nil {
		return fmt.Errorf("advance interview prep question: %w", err)
	}
	return nil
}

func (r *Repo) FinishSession(ctx context.Context, sessionID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_sessions
		SET status = $2,
		    finished_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
	`, sessionID, model.InterviewPrepSessionStatusFinished)
	if err != nil {
		return fmt.Errorf("finish interview prep session: %w", err)
	}
	return nil
}

func (r *Repo) UpsertQuestionResult(ctx context.Context, result *model.InterviewPrepQuestionResult) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO interview_prep_question_results (id, session_id, question_id, self_assessment, answered_at)
		VALUES ($1,$2,$3,$4,$5)
		ON CONFLICT (session_id, question_id)
		DO UPDATE SET self_assessment = EXCLUDED.self_assessment, answered_at = EXCLUDED.answered_at
	`, result.ID, result.SessionID, result.QuestionID, result.SelfAssessment.String(), result.AnsweredAt)
	if err != nil {
		return fmt.Errorf("upsert interview prep question result: %w", err)
	}
	return nil
}

func (r *Repo) ListQuestionResults(ctx context.Context, sessionID uuid.UUID) ([]*model.InterviewPrepQuestionResult, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, session_id, question_id, self_assessment, answered_at
		FROM interview_prep_question_results
		WHERE session_id = $1
		ORDER BY answered_at ASC
	`, sessionID)
	if err != nil {
		return nil, fmt.Errorf("list interview prep question results: %w", err)
	}
	defer rows.Close()

	var items []*model.InterviewPrepQuestionResult
	for rows.Next() {
		item, err := scanQuestionResult(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

// Admin methods

func (r *Repo) ListAllTasks(ctx context.Context) ([]*model.InterviewPrepTask, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, slug, title, statement, prep_type, language, is_executable,
		       execution_profile, runner_mode, duration_seconds, starter_code,
		       reference_solution, is_active, created_at, updated_at
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
			id, slug, title, statement, prep_type, language, is_executable,
			execution_profile, runner_mode, duration_seconds, starter_code,
			reference_solution, is_active, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
	`,
		task.ID,
		task.Slug,
		task.Title,
		task.Statement,
		task.PrepType.String(),
		task.Language,
		task.IsExecutable,
		task.ExecutionProfile,
		task.RunnerMode,
		task.DurationSeconds,
		task.StarterCode,
		task.ReferenceSolution,
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
		    is_executable = $7,
		    execution_profile = $8,
		    runner_mode = $9,
		    duration_seconds = $10,
		    starter_code = $11,
		    reference_solution = $12,
		    is_active = $13,
		    updated_at = NOW()
		WHERE id = $1
	`,
		task.ID,
		task.Slug,
		task.Title,
		task.Statement,
		task.PrepType.String(),
		task.Language,
		task.IsExecutable,
		task.ExecutionProfile,
		task.RunnerMode,
		task.DurationSeconds,
		task.StarterCode,
		task.ReferenceSolution,
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
