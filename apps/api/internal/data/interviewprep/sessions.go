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
		INSERT INTO interview_practice_sessions (
			id, user_id, item_id, status, current_followup_position, solve_language, code, answer_text,
			last_submission_passed, review_score, review_summary, started_at, finished_at, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,'',$8,0,'',$9,$10,$11,$12)
	`,
		session.ID,
		session.UserID,
		session.TaskID,
		session.Status.String(),
		session.CurrentQuestionPosition,
		session.SolveLanguage,
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
		SELECT id, user_id, item_id, status, current_followup_position, solve_language, code,
		       last_submission_passed, started_at, finished_at, created_at, updated_at
		FROM interview_practice_sessions
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
		SELECT id, user_id, item_id, status, current_followup_position, solve_language, code,
		       last_submission_passed, started_at, finished_at, created_at, updated_at
		FROM interview_practice_sessions
		WHERE user_id = $1 AND item_id = $2 AND status = $3
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

func (r *Repo) UpdateSessionCode(ctx context.Context, sessionID uuid.UUID, solveLanguage string, code string, passed bool) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_practice_sessions
		SET solve_language = $2,
		    code = $3,
		    last_submission_passed = $4,
		    updated_at = NOW()
		WHERE id = $1
	`, sessionID, solveLanguage, code, passed)
	if err != nil {
		return fmt.Errorf("update interview prep session code: %w", err)
	}
	return nil
}

func (r *Repo) AdvanceSessionQuestion(ctx context.Context, sessionID uuid.UUID, nextPosition int32) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_practice_sessions
		SET current_followup_position = $2,
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
		UPDATE interview_practice_sessions
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
		INSERT INTO interview_practice_followup_results (
			id, session_id, position, prompt_snapshot, reference_answer_snapshot, candidate_answer,
			self_assessment, score, summary, answered_at, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,'',$6,0,'',$7,$7,$7)
		ON CONFLICT (session_id, position)
		DO UPDATE SET
			prompt_snapshot = EXCLUDED.prompt_snapshot,
			reference_answer_snapshot = EXCLUDED.reference_answer_snapshot,
			self_assessment = EXCLUDED.self_assessment,
			answered_at = EXCLUDED.answered_at,
			updated_at = EXCLUDED.updated_at
	`, result.ID, result.SessionID, result.Position, result.PromptSnapshot, result.AnswerSnapshot, result.SelfAssessment.String(), result.AnsweredAt)
	if err != nil {
		return fmt.Errorf("upsert interview prep question result: %w", err)
	}
	return nil
}

func (r *Repo) ListQuestionResults(ctx context.Context, sessionID uuid.UUID) ([]*model.InterviewPrepQuestionResult, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT
			r.id,
			r.session_id,
			COALESCE(f.id, '00000000-0000-0000-0000-000000000000'::uuid) AS question_id,
			r.position,
			r.prompt_snapshot,
			r.reference_answer_snapshot,
			r.self_assessment,
			r.answered_at
		FROM interview_practice_followup_results r
		JOIN interview_practice_sessions s ON s.id = r.session_id
		LEFT JOIN interview_item_followups f
		  ON f.item_id = s.item_id
		 AND f.position = r.position
		WHERE r.session_id = $1
		ORDER BY r.answered_at ASC, r.position ASC
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
