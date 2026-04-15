package interviewprep

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const zeroUUID = "00000000-0000-0000-0000-000000000000"

func (r *Repo) ListMockBlueprints(ctx context.Context) ([]*model.InterviewMockBlueprintSummary, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT
			b.id,
			t.slug,
			b.slug,
			b.title,
			b.description,
			b.level,
			b.total_duration_seconds,
			COALESCE(array_remove(array_agg(a.alias_slug ORDER BY a.sort_order) FILTER (WHERE a.is_public_start), NULL), ARRAY[]::text[]),
			COALESCE(array_remove(array_agg(a.display_name ORDER BY a.sort_order) FILTER (WHERE a.is_public_start), NULL), ARRAY[]::text[])
		FROM interview_blueprints b
		JOIN interview_tracks t ON t.id = b.track_id
		LEFT JOIN interview_blueprint_aliases a ON a.blueprint_id = b.id
		WHERE b.is_active = TRUE
		GROUP BY b.id, t.slug, b.slug, b.title, b.description, b.level, b.total_duration_seconds
		ORDER BY t.slug ASC, b.slug ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list mock blueprints: %w", err)
	}
	defer rows.Close()

	items := make([]*model.InterviewMockBlueprintSummary, 0, 8)
	for rows.Next() {
		item, scanErr := scanMockBlueprintSummary(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan mock blueprint summary: %w", scanErr)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) ResolveMockBlueprint(ctx context.Context, companyTag string, programSlug string) (*model.InterviewMockBlueprint, error) {
	normalizedProgram := strings.TrimSpace(strings.ToLower(programSlug))
	normalizedCompany := strings.TrimSpace(strings.ToLower(companyTag))

	query := `
		SELECT
			b.id,
			b.track_id,
			t.slug,
			b.slug,
			b.title,
			b.description,
			b.level,
			b.runtime_mode,
			b.total_duration_seconds,
			b.intro_text,
			b.closing_text,
			b.is_active,
			b.created_at,
			b.updated_at
		FROM interview_blueprints b
		JOIN interview_tracks t ON t.id = b.track_id
	`
	var args []any

	switch {
	case normalizedProgram != "":
		query += ` WHERE b.is_active = TRUE AND b.slug = $1`
		args = append(args, normalizedProgram)
	case normalizedCompany != "":
		query += `
			JOIN interview_blueprint_aliases a ON a.blueprint_id = b.id
			WHERE b.is_active = TRUE
			  AND a.alias_slug = $1
		`
		args = append(args, normalizedCompany)
	default:
		query += ` WHERE b.is_active = TRUE AND b.slug = 'gma_general_swe_mid'`
	}

	var item model.InterviewMockBlueprint
	err := r.data.DB.QueryRow(ctx, query, args...).Scan(
		&item.ID,
		&item.TrackID,
		&item.TrackSlug,
		&item.Slug,
		&item.Title,
		&item.Description,
		&item.Level,
		&item.RuntimeMode,
		&item.TotalDurationSeconds,
		&item.IntroText,
		&item.ClosingText,
		&item.IsActive,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("resolve mock blueprint: %w", err)
	}
	return &item, nil
}

func (r *Repo) ListBlueprintRounds(ctx context.Context, blueprintID uuid.UUID) ([]*model.InterviewBlueprintRound, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT
			id,
			blueprint_id,
			position,
			round_type,
			title,
			selection_mode,
			fixed_item_id,
			pool_id,
			duration_seconds,
			evaluator_mode,
			max_followup_count,
			candidate_instructions_override,
			interviewer_instructions_override,
			is_active,
			created_at,
			updated_at
		FROM interview_blueprint_rounds
		WHERE blueprint_id = $1
		  AND is_active = TRUE
		ORDER BY position ASC
	`, blueprintID)
	if err != nil {
		return nil, fmt.Errorf("list blueprint rounds: %w", err)
	}
	defer rows.Close()

	items := make([]*model.InterviewBlueprintRound, 0, 8)
	for rows.Next() {
		item, scanErr := scanBlueprintRound(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan blueprint round: %w", scanErr)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) SelectTaskForBlueprintRound(ctx context.Context, round *model.InterviewBlueprintRound) (*model.InterviewPrepTask, *uuid.UUID, error) {
	if round == nil {
		return nil, nil, nil
	}
	if round.SelectionMode == "fixed_item" && round.FixedItemID != nil {
		task, err := r.GetTask(ctx, *round.FixedItemID)
		if err != nil {
			return nil, nil, err
		}
		return task, nil, nil
	}
	if round.PoolID == nil {
		return nil, nil, nil
	}

	row := r.data.DB.QueryRow(ctx, `
		SELECT
			i.id, i.slug, i.title, i.candidate_prompt, i.round_type, i.language, i.legacy_company_tag, i.supported_languages, i.is_executable,
			i.execution_profile, i.runner_mode, i.duration_seconds, i.starter_code,
			i.reference_solution, i.linked_code_task_id, i.is_active, i.created_at, i.updated_at,
			pi.pool_id
		FROM interview_pool_items pi
		JOIN interview_items i ON i.id = pi.item_id
		WHERE pi.pool_id = $1
		  AND pi.is_active = TRUE
		  AND i.is_active = TRUE
		  AND i.is_mock_enabled = TRUE
		ORDER BY (random() * GREATEST(pi.weight, 1)) DESC, pi.position ASC
		LIMIT 1
	`, *round.PoolID)

	var poolID uuid.UUID
	task, err := scanTaskWithPool(row, &poolID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, nil
		}
		return nil, nil, fmt.Errorf("select task for blueprint round: %w", err)
	}
	return task, &poolID, nil
}

func scanTaskWithPool(s scanner, poolID *uuid.UUID) (*model.InterviewPrepTask, error) {
	var item model.InterviewPrepTask
	var roundType string
	if err := s.Scan(
		&item.ID,
		&item.Slug,
		&item.Title,
		&item.Statement,
		&roundType,
		&item.Language,
		&item.CompanyTag,
		&item.SupportedLanguages,
		&item.IsExecutable,
		&item.ExecutionProfile,
		&item.RunnerMode,
		&item.DurationSeconds,
		&item.StarterCode,
		&item.ReferenceSolution,
		&item.CodeTaskID,
		&item.IsActive,
		&item.CreatedAt,
		&item.UpdatedAt,
		poolID,
	); err != nil {
		return nil, err
	}
	item.PrepType = model.InterviewPrepTypeFromRoundType(roundType)
	return &item, nil
}

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

	var blueprintID *uuid.UUID
	if strings.TrimSpace(session.BlueprintSlug) != "" {
		row := tx.QueryRow(ctx, `SELECT id FROM interview_blueprints WHERE slug = $1`, session.BlueprintSlug)
		var value uuid.UUID
		if scanErr := row.Scan(&value); scanErr == nil {
			blueprintID = &value
		}
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO interview_mock_sessions (
			id, user_id, blueprint_id, started_via_alias, status, current_round_index,
			started_at, finished_at, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
	`,
		session.ID,
		session.UserID,
		blueprintID,
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
		roundType := "coding_practical"
		if stage.Task != nil {
			roundType = roundTypeForPrepTask(stage.Task.PrepType)
		} else if stage.Kind == model.InterviewPrepMockStageKindSlices {
			roundType = "coding_algorithmic"
		} else if stage.Kind == model.InterviewPrepMockStageKindSQL {
			roundType = "sql"
		} else if stage.Kind == model.InterviewPrepMockStageKindSystemDesign {
			roundType = "system_design"
		} else if stage.Kind == model.InterviewPrepMockStageKindArchitecture {
			roundType = "behavioral"
		}

		titleSnapshot := ""
		statementSnapshot := ""
		referenceSolutionSnapshot := ""
		starterCodeSnapshot := ""
		if stage.Task != nil {
			titleSnapshot = stage.Task.Title
			statementSnapshot = stage.Task.Statement
			referenceSolutionSnapshot = stage.Task.ReferenceSolution
			starterCodeSnapshot = stage.Task.StarterCode
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO interview_mock_rounds (
				id, session_id, round_index, round_type, status, blueprint_round_id, source_item_id, source_pool_id, title_snapshot,
				candidate_prompt_snapshot, interviewer_script_snapshot, reference_solution_snapshot, starter_code_snapshot, solve_language, code, answer_text,
				design_notes, design_components, design_apis, design_database_schema, design_traffic, design_reliability,
				last_submission_passed, review_score, review_summary, started_at, finished_at, created_at, updated_at
			)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'',$11,$12,$13,$14,'','','','','','','',$15,$16,$17,$18,$19,$20,$21)
		`,
			stage.ID,
			stage.SessionID,
			stage.StageIndex,
			roundType,
			stage.Status.String(),
			stage.BlueprintRoundID,
			stage.TaskID,
			stage.SourcePoolID,
			titleSnapshot,
			statementSnapshot,
			referenceSolutionSnapshot,
			starterCodeSnapshot,
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
			return fmt.Errorf("insert mock round: %w", err)
		}
	}

	for _, item := range questionResults {
		_, err = tx.Exec(ctx, `
			INSERT INTO interview_mock_round_followups (
				id, round_id, position, prompt_snapshot, interviewer_intent_snapshot, reference_answer_snapshot,
				rubric_hint_snapshot, candidate_answer, score, summary, answered_at, created_at, updated_at
			)
			VALUES ($1,$2,$3,$4,'',$5,'','',$6,$7,$8,$9,$10)
		`,
			item.ID,
			item.StageID,
			item.Position,
			item.Prompt,
			item.ReferenceAnswer,
			item.Score,
			item.Summary,
			item.AnsweredAt,
			item.CreatedAt,
			item.UpdatedAt,
		)
		if err != nil {
			return fmt.Errorf("insert mock round followup: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit mock session tx: %w", err)
	}
	return nil
}

func (r *Repo) GetMockSession(ctx context.Context, sessionID uuid.UUID) (*model.InterviewPrepMockSession, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT
			ms.id,
			ms.user_id,
			COALESCE(ms.started_via_alias, ''),
			COALESCE(b.slug, ''),
			COALESCE(b.title, ''),
			COALESCE(t.slug, ''),
			ms.status,
			ms.current_round_index,
			ms.started_at,
			ms.finished_at,
			ms.created_at,
			ms.updated_at
		FROM interview_mock_sessions ms
		LEFT JOIN interview_blueprints b ON b.id = ms.blueprint_id
		LEFT JOIN interview_tracks t ON t.id = b.track_id
		WHERE ms.id = $1
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
		SELECT
			ms.id,
			ms.user_id,
			COALESCE(ms.started_via_alias, ''),
			COALESCE(b.slug, ''),
			COALESCE(b.title, ''),
			COALESCE(t.slug, ''),
			ms.status,
			ms.current_round_index,
			ms.started_at,
			ms.finished_at,
			ms.created_at,
			ms.updated_at
		FROM interview_mock_sessions ms
		LEFT JOIN interview_blueprints b ON b.id = ms.blueprint_id
		LEFT JOIN interview_tracks t ON t.id = b.track_id
		WHERE ms.user_id = $1 AND ms.status = $2
		ORDER BY ms.updated_at DESC
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
	normalized := strings.TrimSpace(strings.ToLower(companyTag))
	if normalized == "" {
		normalized = "gma_general_swe_mid"
	}

	row := r.data.DB.QueryRow(ctx, `
		SELECT
			ms.id,
			ms.user_id,
			COALESCE(ms.started_via_alias, ''),
			COALESCE(b.slug, ''),
			COALESCE(b.title, ''),
			COALESCE(t.slug, ''),
			ms.status,
			ms.current_round_index,
			ms.started_at,
			ms.finished_at,
			ms.created_at,
			ms.updated_at
		FROM interview_mock_sessions ms
		LEFT JOIN interview_blueprints b ON b.id = ms.blueprint_id
		LEFT JOIN interview_tracks t ON t.id = b.track_id
		WHERE ms.user_id = $1
		  AND ms.status = $3
		  AND (
			LOWER(COALESCE(ms.started_via_alias, '')) = $2 OR
			LOWER(COALESCE(b.slug, '')) = $2
		  )
		ORDER BY ms.updated_at DESC
		LIMIT 1
	`, userID, normalized, model.InterviewPrepMockSessionStatusActive)

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
		SELECT
			id, session_id, round_index, round_type, status, COALESCE(source_item_id, '`+zeroUUID+`'::uuid), blueprint_round_id, source_pool_id,
			solve_language, code, last_submission_passed, review_score, review_summary,
			started_at, finished_at, created_at, updated_at
		FROM interview_mock_rounds
		WHERE session_id = $1
		ORDER BY round_index ASC
	`, sessionID)
	if err != nil {
		return nil, fmt.Errorf("list mock rounds: %w", err)
	}
	defer rows.Close()

	items := make([]*model.InterviewPrepMockStage, 0, 8)
	for rows.Next() {
		item, scanErr := scanMockStage(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan mock round: %w", scanErr)
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
		SELECT
			id, round_id, position, prompt_snapshot, reference_answer_snapshot,
			score, summary, answered_at, created_at, updated_at
		FROM interview_mock_round_followups
		WHERE round_id = $1
		ORDER BY position ASC
	`, stageID)
	if err != nil {
		return nil, fmt.Errorf("list mock round followups: %w", err)
	}
	defer rows.Close()

	items := make([]*model.InterviewPrepMockQuestionResult, 0, 4)
	for rows.Next() {
		item, scanErr := scanMockQuestionResult(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan mock round followup: %w", scanErr)
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
		UPDATE interview_mock_rounds
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
		return fmt.Errorf("update mock round submission: %w", err)
	}
	return nil
}

func (r *Repo) CompleteMockQuestion(ctx context.Context, questionResultID uuid.UUID, score int32, summary string, answeredAt time.Time) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_mock_round_followups
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
		UPDATE interview_mock_rounds
		SET status = $2,
		    updated_at = NOW()
		WHERE id = $1
	`, stageID, status.String())
	if err != nil {
		return fmt.Errorf("set mock round status: %w", err)
	}
	return nil
}

func (r *Repo) AdvanceMockSession(ctx context.Context, sessionID uuid.UUID, currentStageIndex int32) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_mock_sessions
		SET current_round_index = $2,
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
		UPDATE interview_mock_rounds
		SET status = $2,
		    finished_at = NOW(),
		    updated_at = NOW()
		WHERE id = $1
	`, stageID, model.InterviewPrepMockStageStatusCompleted.String())
	if err != nil {
		return fmt.Errorf("complete mock round: %w", err)
	}
	return nil
}

func (r *Repo) FinishMockSession(ctx context.Context, sessionID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_mock_sessions
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
