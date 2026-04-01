package interviewprep

import (
	"context"
	"errors"
	"fmt"

	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

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
