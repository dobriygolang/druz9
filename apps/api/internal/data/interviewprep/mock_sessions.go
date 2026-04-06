package interviewprep

import (
	"context"
	"errors"
	"fmt"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (r *Repo) CreateMockSession(
	ctx context.Context,
	session *model.InterviewPrepMockSession,
	stages []*model.InterviewPrepMockStage,
	questionResults []*model.InterviewPrepMockQuestionResult,
) error {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin mock session tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	_, err = tx.Exec(ctx, `
		INSERT INTO interview_prep_mock_sessions (
			id, user_id, company_tag, status, current_stage_index,
			started_at, finished_at, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
	`,
		session.ID,
		session.UserID,
		session.CompanyTag,
		session.Status.String(),
		session.CurrentStageIndex,
		session.StartedAt,
		session.FinishedAt,
		session.CreatedAt,
		session.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert mock session: %w", err)
	}

	for _, stage := range stages {
		_, err = tx.Exec(ctx, `
			INSERT INTO interview_prep_mock_stages (
				id, session_id, stage_index, kind, status, task_id,
				solve_language, code, last_submission_passed, review_score, review_summary,
				started_at, finished_at, created_at, updated_at
			)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		`,
			stage.ID,
			stage.SessionID,
			stage.StageIndex,
			stage.Kind.String(),
			stage.Status.String(),
			stage.TaskID,
			stage.SolveLanguage,
			stage.Code,
			stage.LastSubmissionPassed,
			stage.ReviewScore,
			stage.ReviewSummary,
			stage.StartedAt,
			stage.FinishedAt,
			stage.CreatedAt,
			stage.UpdatedAt,
		)
		if err != nil {
			return fmt.Errorf("insert mock stage: %w", err)
		}
	}

	for _, item := range questionResults {
		_, err = tx.Exec(ctx, `
			INSERT INTO interview_prep_mock_stage_question_results (
				id, stage_id, position, question_key, prompt, reference_answer,
				score, summary, answered_at, created_at, updated_at
			)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		`,
			item.ID,
			item.StageID,
			item.Position,
			item.QuestionKey,
			item.Prompt,
			item.ReferenceAnswer,
			item.Score,
			item.Summary,
			item.AnsweredAt,
			item.CreatedAt,
			item.UpdatedAt,
		)
		if err != nil {
			return fmt.Errorf("insert mock stage question result: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit mock session tx: %w", err)
	}
	return nil
}

func (r *Repo) GetMockSession(ctx context.Context, sessionID uuid.UUID) (*model.InterviewPrepMockSession, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT id, user_id, company_tag, status, current_stage_index,
		       started_at, finished_at, created_at, updated_at
		FROM interview_prep_mock_sessions
		WHERE id = $1
	`, sessionID)

	session, err := scanMockSession(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get mock session: %w", err)
	}

	stages, err := r.listMockStages(ctx, session.ID)
	if err != nil {
		return nil, err
	}
	session.Stages = stages
	for _, stage := range stages {
		if stage.StageIndex == session.CurrentStageIndex {
			session.CurrentStage = stage
			break
		}
	}
	return session, nil
}

func (r *Repo) GetAnyActiveMockSessionByUser(ctx context.Context, userID uuid.UUID) (*model.InterviewPrepMockSession, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT id, user_id, company_tag, status, current_stage_index,
		       started_at, finished_at, created_at, updated_at
		FROM interview_prep_mock_sessions
		WHERE user_id = $1 AND status = $2
		ORDER BY updated_at DESC
		LIMIT 1
	`, userID, model.InterviewPrepMockSessionStatusActive)

	session, err := scanMockSession(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get any active mock session: %w", err)
	}
	return r.GetMockSession(ctx, session.ID)
}

func (r *Repo) GetActiveMockSessionByUserAndCompany(ctx context.Context, userID uuid.UUID, companyTag string) (*model.InterviewPrepMockSession, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT id, user_id, company_tag, status, current_stage_index,
		       started_at, finished_at, created_at, updated_at
		FROM interview_prep_mock_sessions
		WHERE user_id = $1 AND company_tag = $2 AND status = $3
		ORDER BY updated_at DESC
		LIMIT 1
	`, userID, companyTag, model.InterviewPrepMockSessionStatusActive)

	session, err := scanMockSession(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get active mock session: %w", err)
	}
	return r.GetMockSession(ctx, session.ID)
}

func (r *Repo) listMockStages(ctx context.Context, sessionID uuid.UUID) ([]*model.InterviewPrepMockStage, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, session_id, stage_index, kind, status, task_id,
		       solve_language, code, last_submission_passed, review_score, review_summary,
		       started_at, finished_at, created_at, updated_at
		FROM interview_prep_mock_stages
		WHERE session_id = $1
		ORDER BY stage_index ASC
	`, sessionID)
	if err != nil {
		return nil, fmt.Errorf("list mock stages: %w", err)
	}
	defer rows.Close()

	var items []*model.InterviewPrepMockStage
	for rows.Next() {
		item, scanErr := scanMockStage(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan mock stage: %w", scanErr)
		}
		questions, questionsErr := r.listMockQuestionResults(ctx, item.ID)
		if questionsErr != nil {
			return nil, questionsErr
		}
		item.QuestionResults = questions
		for _, question := range questions {
			if question.AnsweredAt == nil {
				item.CurrentQuestion = question
				break
			}
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) listMockQuestionResults(ctx context.Context, stageID uuid.UUID) ([]*model.InterviewPrepMockQuestionResult, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, stage_id, position, question_key, prompt, reference_answer,
		       score, summary, answered_at, created_at, updated_at
		FROM interview_prep_mock_stage_question_results
		WHERE stage_id = $1
		ORDER BY position ASC
	`, stageID)
	if err != nil {
		return nil, fmt.Errorf("list mock question results: %w", err)
	}
	defer rows.Close()

	var items []*model.InterviewPrepMockQuestionResult
	for rows.Next() {
		item, scanErr := scanMockQuestionResult(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan mock question result: %w", scanErr)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) UpdateMockStageSubmission(
	ctx context.Context,
	stageID uuid.UUID,
	solveLanguage string,
	code string,
	passed bool,
	reviewScore int32,
	reviewSummary string,
	nextStatus model.InterviewPrepMockStageStatus,
) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_mock_stages
		SET solve_language = $2,
		    code = $3,
		    last_submission_passed = $4,
		    review_score = $5,
		    review_summary = $6,
		    status = $7,
		    updated_at = NOW()
		WHERE id = $1
	`, stageID, solveLanguage, code, passed, reviewScore, reviewSummary, nextStatus.String())
	if err != nil {
		return fmt.Errorf("update mock stage submission: %w", err)
	}
	return nil
}

func (r *Repo) CompleteMockQuestion(ctx context.Context, questionResultID uuid.UUID, score int32, summary string, answeredAt time.Time) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_mock_stage_question_results
		SET score = $2,
		    summary = $3,
		    answered_at = $4,
		    updated_at = NOW()
		WHERE id = $1
	`, questionResultID, score, summary, answeredAt)
	if err != nil {
		return fmt.Errorf("complete mock question: %w", err)
	}
	return nil
}

func (r *Repo) SetMockStageStatus(ctx context.Context, stageID uuid.UUID, status model.InterviewPrepMockStageStatus) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_mock_stages
		SET status = $2,
		    updated_at = NOW()
		WHERE id = $1
	`, stageID, status.String())
	if err != nil {
		return fmt.Errorf("set mock stage status: %w", err)
	}
	return nil
}

func (r *Repo) AdvanceMockSession(ctx context.Context, sessionID uuid.UUID, currentStageIndex int32) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_mock_sessions
		SET current_stage_index = $2,
		    updated_at = NOW()
		WHERE id = $1
	`, sessionID, currentStageIndex)
	if err != nil {
		return fmt.Errorf("advance mock session: %w", err)
	}
	return nil
}

func (r *Repo) CompleteMockStage(ctx context.Context, stageID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_mock_stages
		SET status = $2,
		    finished_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
	`, stageID, model.InterviewPrepMockStageStatusCompleted.String())
	if err != nil {
		return fmt.Errorf("complete mock stage: %w", err)
	}
	return nil
}

func (r *Repo) FinishMockSession(ctx context.Context, sessionID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_mock_sessions
		SET status = $2,
		    finished_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
	`, sessionID, model.InterviewPrepMockSessionStatusFinished.String())
	if err != nil {
		return fmt.Errorf("finish mock session: %w", err)
	}
	return nil
}
