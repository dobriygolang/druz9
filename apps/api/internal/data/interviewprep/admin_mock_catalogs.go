package interviewprep

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"api/internal/model"
)

func (r *Repo) ListMockQuestionPools(ctx context.Context) ([]*model.InterviewPrepMockQuestionPoolItem, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, topic, company_tag, question_key, prompt, reference_answer,
		       position, always_ask, is_active, created_at, updated_at
		FROM interview_prep_mock_question_pools
		ORDER BY topic ASC, company_tag ASC, position ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list mock question pools: %w", err)
	}
	defer rows.Close()

	var items []*model.InterviewPrepMockQuestionPoolItem
	for rows.Next() {
		var item model.InterviewPrepMockQuestionPoolItem
		if err := rows.Scan(
			&item.ID,
			&item.Topic,
			&item.CompanyTag,
			&item.QuestionKey,
			&item.Prompt,
			&item.ReferenceAnswer,
			&item.Position,
			&item.AlwaysAsk,
			&item.IsActive,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan mock question pool: %w", err)
		}
		items = append(items, &item)
	}
	return items, rows.Err()
}

func (r *Repo) CreateMockQuestionPool(ctx context.Context, item *model.InterviewPrepMockQuestionPoolItem) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO interview_prep_mock_question_pools (
			id, topic, company_tag, question_key, prompt, reference_answer,
			position, always_ask, is_active, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	`,
		item.ID, item.Topic, item.CompanyTag, item.QuestionKey, item.Prompt, item.ReferenceAnswer,
		item.Position, item.AlwaysAsk, item.IsActive, item.CreatedAt, item.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create mock question pool: %w", err)
	}
	return nil
}

func (r *Repo) UpdateMockQuestionPool(ctx context.Context, item *model.InterviewPrepMockQuestionPoolItem) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_mock_question_pools
		SET topic = $2,
		    company_tag = $3,
		    question_key = $4,
		    prompt = $5,
		    reference_answer = $6,
		    position = $7,
		    always_ask = $8,
		    is_active = $9,
		    updated_at = $10
		WHERE id = $1
	`,
		item.ID, item.Topic, item.CompanyTag, item.QuestionKey, item.Prompt, item.ReferenceAnswer,
		item.Position, item.AlwaysAsk, item.IsActive, item.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("update mock question pool: %w", err)
	}
	return nil
}

func (r *Repo) DeleteMockQuestionPool(ctx context.Context, itemID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `DELETE FROM interview_prep_mock_question_pools WHERE id = $1`, itemID)
	if err != nil {
		return fmt.Errorf("delete mock question pool: %w", err)
	}
	return nil
}

func (r *Repo) ListMockCompanyPresets(ctx context.Context) ([]*model.InterviewPrepMockCompanyPreset, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, company_tag, stage_kind, position, task_slug_pattern, ai_model_override,
		       is_active, created_at, updated_at
		FROM interview_prep_mock_company_presets
		ORDER BY company_tag ASC, position ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list mock company presets: %w", err)
	}
	defer rows.Close()

	var items []*model.InterviewPrepMockCompanyPreset
	for rows.Next() {
		var item model.InterviewPrepMockCompanyPreset
		var kind string
		if err := rows.Scan(
			&item.ID,
			&item.CompanyTag,
			&kind,
			&item.Position,
			&item.TaskSlugPattern,
			&item.AIModelOverride,
			&item.IsActive,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan mock company preset: %w", err)
		}
		item.StageKind = model.InterviewPrepMockStageKindFromString(kind)
		items = append(items, &item)
	}
	return items, rows.Err()
}

func (r *Repo) GetAvailableCompanies(ctx context.Context) ([]string, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT alias_slug
		FROM interview_blueprint_aliases
		WHERE is_public_start = TRUE
		  AND NULLIF(BTRIM(alias_slug), '') IS NOT NULL
		ORDER BY sort_order ASC, alias_slug ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("get available companies: %w", err)
	}
	defer rows.Close()

	companies := make([]string, 0, 16)
	for rows.Next() {
		var company string
		if err := rows.Scan(&company); err != nil {
			return nil, fmt.Errorf("scan available company: %w", err)
		}
		company = strings.TrimSpace(company)
		if company != "" {
			companies = append(companies, company)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate available companies: %w", err)
	}

	return companies, nil
}

func (r *Repo) CreateMockCompanyPreset(ctx context.Context, item *model.InterviewPrepMockCompanyPreset) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO interview_prep_mock_company_presets (
			id, company_tag, stage_kind, position, task_slug_pattern, ai_model_override,
			is_active, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
	`,
		item.ID, item.CompanyTag, item.StageKind.String(), item.Position, item.TaskSlugPattern, item.AIModelOverride,
		item.IsActive, item.CreatedAt, item.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create mock company preset: %w", err)
	}
	return nil
}

func (r *Repo) UpdateMockCompanyPreset(ctx context.Context, item *model.InterviewPrepMockCompanyPreset) error {
	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_prep_mock_company_presets
		SET company_tag = $2,
		    stage_kind = $3,
		    position = $4,
		    task_slug_pattern = $5,
		    ai_model_override = $6,
		    is_active = $7,
		    updated_at = $8
		WHERE id = $1
	`,
		item.ID, item.CompanyTag, item.StageKind.String(), item.Position, item.TaskSlugPattern, item.AIModelOverride,
		item.IsActive, item.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("update mock company preset: %w", err)
	}
	return nil
}

func (r *Repo) DeleteMockCompanyPreset(ctx context.Context, itemID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `DELETE FROM interview_prep_mock_company_presets WHERE id = $1`, itemID)
	if err != nil {
		return fmt.Errorf("delete mock company preset: %w", err)
	}
	return nil
}
