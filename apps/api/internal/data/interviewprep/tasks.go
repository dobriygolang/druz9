package interviewprep

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/model"
)

func (r *Repo) ListActiveTasks(ctx context.Context) ([]*model.InterviewPrepTask, error) {
	rows, err := r.data.DB.Query(ctx, `
		SELECT id, slug, title, candidate_prompt, round_type, language, legacy_company_tag, supported_languages, is_executable,
		       execution_profile, runner_mode, duration_seconds, starter_code,
		       reference_solution, linked_code_task_id, is_active,
		       ai_review_prompt, is_practice_enabled, is_mock_enabled, created_at, updated_at
		FROM interview_items
		WHERE is_active = TRUE
		  AND is_practice_enabled = TRUE
		ORDER BY created_at DESC, slug ASC
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
		SELECT id, slug, title, candidate_prompt, round_type, language, legacy_company_tag, supported_languages, is_executable,
		       execution_profile, runner_mode, duration_seconds, starter_code,
		       reference_solution, linked_code_task_id, is_active,
		       ai_review_prompt, is_practice_enabled, is_mock_enabled, created_at, updated_at
		FROM interview_items
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
	return r.ListTasksFiltered(ctx, "", "", "", true)
}

// ListTasksFiltered powers the admin list with optional company /
// prep-type / free-text filters plus a toggle for hiding inactive rows.
// The result includes pool_count so the UI can warn when a tagged task
// isn't wired into any pool (which is why tagged-but-invisible tasks
// happen in practice).
func (r *Repo) ListTasksFiltered(ctx context.Context, companyTag, prepTypeFilter, search string, includeInactive bool) ([]*model.InterviewPrepTask, error) {
	where := "TRUE"
	args := []any{}
	idx := 1
	if !includeInactive {
		where += " AND is_active = TRUE"
	}
	if tag := strings.TrimSpace(strings.ToLower(companyTag)); tag != "" {
		where += fmt.Sprintf(" AND legacy_company_tag = $%d", idx)
		args = append(args, tag)
		idx++
	}
	if pt := strings.TrimSpace(strings.ToLower(prepTypeFilter)); pt != "" {
		// PrepType name → round_type (same mapping as roundTypeForPrepTask).
		roundType := pt
		switch pt {
		case "algorithm":
			roundType = "coding_algorithmic"
		case "coding":
			roundType = "coding_practical"
		case "system_design":
			roundType = "system_design"
		case "sql":
			roundType = "sql"
		case "behavioral":
			roundType = "behavioral"
		case "code_review":
			roundType = "code_review"
		}
		where += fmt.Sprintf(" AND round_type = $%d", idx)
		args = append(args, roundType)
		idx++
	}
	if q := strings.TrimSpace(search); q != "" {
		where += fmt.Sprintf(" AND (title ILIKE $%d OR slug ILIKE $%d OR candidate_prompt ILIKE $%d)", idx, idx, idx)
		args = append(args, "%"+q+"%")
	}
	// pool_count via correlated subquery — keeps the row set small vs a LEFT JOIN + GROUP BY.
	query := fmt.Sprintf(`
		SELECT id, slug, title, candidate_prompt, round_type, language, legacy_company_tag, supported_languages, is_executable,
		       execution_profile, runner_mode, duration_seconds, starter_code,
		       reference_solution, linked_code_task_id, is_active,
		       ai_review_prompt, is_practice_enabled, is_mock_enabled, created_at, updated_at,
		       (SELECT COUNT(*) FROM interview_pool_items WHERE item_id = interview_items.id AND is_active = TRUE) AS pool_count
		FROM interview_items
		WHERE %s
		ORDER BY created_at DESC, slug ASC
	`, where)
	rows, err := r.data.DB.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list filtered interview prep tasks: %w", err)
	}
	defer rows.Close()

	var items []*model.InterviewPrepTask
	for rows.Next() {
		item, err := scanTaskWithPoolCount(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *Repo) CreateTask(ctx context.Context, task *model.InterviewPrepTask) error {
	roundType := roundTypeForPrepTask(task.PrepType)
	deliveryMode := deliveryModeForTask(task)
	supportedLanguages := normalizeSupportedLanguages(task)

	// Admin toggles drive is_practice_enabled / is_mock_enabled. Before
	// this patch they were hard-coded TRUE — which is why tasks with
	// missing flags on legacy rows were never the issue; the real
	// invisibility comes from pool membership. ai_review_prompt is
	// written straight through.
	practice := task.IsPracticeEnabled
	mock := task.IsMockEnabled
	if !practice && !mock {
		// Default for new tasks so admin doesn't have to remember to
		// flip both toggles for a brand-new task to show up.
		practice = true
		mock = true
	}
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO interview_items (
			id, slug, title, round_type, delivery_mode, difficulty_level, duration_seconds, language, supported_languages, legacy_company_tag,
			is_practice_enabled, is_mock_enabled, is_executable, execution_profile, runner_mode, linked_code_task_id,
			candidate_prompt, interviewer_script, reference_solution, starter_code, debrief_template, is_active, ai_review_prompt, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,'mid',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'',$17,$18,'',$19,$20,$21,$22)
	`,
		task.ID,
		task.Slug,
		task.Title,
		roundType,
		deliveryMode,
		task.DurationSeconds,
		task.Language,
		supportedLanguages,
		strings.TrimSpace(strings.ToLower(task.CompanyTag)),
		practice,
		mock,
		task.IsExecutable,
		task.ExecutionProfile,
		task.RunnerMode,
		task.CodeTaskID,
		task.Statement,
		task.ReferenceSolution,
		task.StarterCode,
		task.IsActive,
		task.AIReviewPrompt,
		task.CreatedAt,
		task.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("create interview prep task: %w", err)
	}
	if err := r.syncDefaultPoolsForTask(ctx, task.ID, roundType, strings.TrimSpace(strings.ToLower(task.CompanyTag))); err != nil {
		return err
	}
	return nil
}

func (r *Repo) UpdateTask(ctx context.Context, task *model.InterviewPrepTask) error {
	roundType := roundTypeForPrepTask(task.PrepType)
	deliveryMode := deliveryModeForTask(task)
	supportedLanguages := normalizeSupportedLanguages(task)

	_, err := r.data.DB.Exec(ctx, `
		UPDATE interview_items
		SET slug = $2,
		    title = $3,
		    round_type = $4,
		    delivery_mode = $5,
		    duration_seconds = $6,
		    language = $7,
		    legacy_company_tag = $8,
		    supported_languages = $9,
		    is_executable = $10,
		    execution_profile = $11,
		    runner_mode = $12,
		    linked_code_task_id = $13,
		    candidate_prompt = $14,
		    reference_solution = $15,
		    starter_code = $16,
		    is_active = $17,
		    is_practice_enabled = $18,
		    is_mock_enabled = $19,
		    ai_review_prompt = $20,
		    updated_at = NOW()
		WHERE id = $1
	`,
		task.ID,
		task.Slug,
		task.Title,
		roundType,
		deliveryMode,
		task.DurationSeconds,
		task.Language,
		strings.TrimSpace(strings.ToLower(task.CompanyTag)),
		supportedLanguages,
		task.IsExecutable,
		task.ExecutionProfile,
		task.RunnerMode,
		task.CodeTaskID,
		task.Statement,
		task.ReferenceSolution,
		task.StarterCode,
		task.IsActive,
		task.IsPracticeEnabled,
		task.IsMockEnabled,
		task.AIReviewPrompt,
	)
	if err != nil {
		return fmt.Errorf("update interview prep task: %w", err)
	}
	if err := r.syncDefaultPoolsForTask(ctx, task.ID, roundType, strings.TrimSpace(strings.ToLower(task.CompanyTag))); err != nil {
		return err
	}
	return nil
}

func (r *Repo) DeleteTask(ctx context.Context, taskID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `
		DELETE FROM interview_items WHERE id = $1
	`, taskID)
	if err != nil {
		return fmt.Errorf("delete interview prep task: %w", err)
	}
	return nil
}

func roundTypeForPrepTask(prepType model.InterviewPrepType) string {
	switch prepType {
	case model.InterviewPrepTypeAlgorithm:
		return "coding_algorithmic"
	case model.InterviewPrepTypeSQL:
		return "sql"
	case model.InterviewPrepTypeSystemDesign:
		return "system_design"
	case model.InterviewPrepTypeBehavioral:
		return "behavioral"
	case model.InterviewPrepTypeCodeReview:
		return "code_review"
	default:
		return "coding_practical"
	}
}

func deliveryModeForTask(task *model.InterviewPrepTask) string {
	if task == nil {
		return "text_answer"
	}
	switch task.PrepType {
	case model.InterviewPrepTypeUnknown, model.InterviewPrepTypeCoding, model.InterviewPrepTypeAlgorithm, model.InterviewPrepTypeSQL:
	case model.InterviewPrepTypeSystemDesign:
		return "system_design_form"
	case model.InterviewPrepTypeBehavioral, model.InterviewPrepTypeCodeReview:
		if !task.IsExecutable {
			return "text_answer"
		}
	}
	if task.IsExecutable || strings.EqualFold(task.Language, "sql") {
		return "code_editor"
	}
	return "text_answer"
}

func normalizeSupportedLanguages(task *model.InterviewPrepTask) []string {
	if task == nil {
		return []string{}
	}
	if len(task.SupportedLanguages) > 0 {
		return append([]string{}, task.SupportedLanguages...)
	}
	if strings.TrimSpace(task.Language) == "" {
		return []string{}
	}
	return []string{strings.TrimSpace(strings.ToLower(task.Language))}
}

func (r *Repo) syncDefaultPoolsForTask(ctx context.Context, taskID uuid.UUID, roundType, companyTag string) error {
	if _, err := r.data.DB.Exec(ctx, `DELETE FROM interview_pool_items WHERE item_id = $1`, taskID); err != nil {
		return fmt.Errorf("clear task pool membership: %w", err)
	}

	pools := defaultPoolIDsForTask(roundType, companyTag)
	for _, poolID := range pools {
		_, err := r.data.DB.Exec(ctx, `
			INSERT INTO interview_pool_items (id, pool_id, item_id, position, weight, is_active, created_at, updated_at)
			VALUES (
				$1,
				$2,
				$3,
				COALESCE((SELECT MAX(position) + 1 FROM interview_pool_items WHERE pool_id = $2), 1),
				1,
				TRUE,
				$4,
				$4
			)
			ON CONFLICT (pool_id, item_id) DO UPDATE SET
				is_active = TRUE,
				updated_at = EXCLUDED.updated_at
		`, uuid.New(), poolID, taskID, time.Now().UTC())
		if err != nil {
			return fmt.Errorf("add task to default pool %s: %w", poolID, err)
		}
	}

	return nil
}

func defaultPoolIDsForTask(roundType string, companyTag string) []string {
	pools := make([]string, 0, 2)
	normalizedCompany := strings.TrimSpace(strings.ToLower(companyTag))

	switch roundType {
	case "coding_algorithmic":
		pools = append(pools, "47af81aa-7f69-4d1e-8d18-2ccca7c22001")
	case "coding_practical", "code_review":
		pools = append(pools, "47af81aa-7f69-4d1e-8d18-2ccca7c22002")
	case "system_design":
		pools = append(pools, "47af81aa-7f69-4d1e-8d18-2ccca7c22003")
	case "behavioral":
		pools = append(pools, "47af81aa-7f69-4d1e-8d18-2ccca7c22004")
	}

	switch roundType {
	case "coding_practical", "code_review":
		if normalizedCompany == "ozon" || normalizedCompany == "avito" || normalizedCompany == "yandex" {
			pools = append(pools, "47af81aa-7f69-4d1e-8d18-2ccca7c22005")
		}
	case "sql":
		if normalizedCompany == "ozon" || normalizedCompany == "avito" || normalizedCompany == "yandex" {
			pools = append(pools, "47af81aa-7f69-4d1e-8d18-2ccca7c22006")
		}
	case "system_design":
		if normalizedCompany == "ozon" || normalizedCompany == "avito" || normalizedCompany == "yandex" {
			pools = append(pools, "47af81aa-7f69-4d1e-8d18-2ccca7c22007")
		}
	case "behavioral":
		if normalizedCompany == "ozon" || normalizedCompany == "avito" || normalizedCompany == "yandex" {
			pools = append(pools, "47af81aa-7f69-4d1e-8d18-2ccca7c22008")
		}
	}

	return pools
}
