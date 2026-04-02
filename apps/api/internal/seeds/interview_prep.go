package seeds

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const interviewPrepSeedName = "interview_prep_pack"
const interviewPrepCatalogPath = "scripts/seeds/catalogs/interview_prep.json"
const interviewPrepSeedVersion = "v5-mock-interview"

func (r *Runner) runInterviewPrep(ctx context.Context) (Result, error) {
	catalog, rawCatalog, err := loadInterviewPrepCatalog(interviewPrepCatalogPath)
	if err != nil {
		return Result{}, err
	}
	catalog.Tasks = append(catalog.Tasks, generatedInterviewPrepTasks()...)

	generatedCatalog, err := json.Marshal(catalog.Tasks)
	if err != nil {
		return Result{}, fmt.Errorf("marshal generated interview prep catalog: %w", err)
	}
	checksumPayload := append([]byte{}, rawCatalog...)
	checksumPayload = append(checksumPayload, []byte("|"+interviewPrepSeedVersion+"|")...)
	checksumPayload = append(checksumPayload, generatedCatalog...)
	checksum := digest(checksumPayload)
	shouldApply, appliedAt, err := r.shouldApply(ctx, interviewPrepSeedName, seedKindCatalog, checksum)
	if err != nil {
		return Result{}, err
	}
	if !shouldApply {
		return Result{
			Name:      interviewPrepSeedName,
			Kind:      seedKindCatalog,
			Applied:   false,
			Message:   "already applied",
			AppliedAt: appliedAt,
		}, nil
	}

	existingCodeTasks, err := r.codeEditor.ListTasks(ctx, model.CodeTaskFilter{IncludeInactive: true})
	if err != nil {
		return Result{}, fmt.Errorf("list existing code tasks for interview prep: %w", err)
	}
	codeTasksBySlug := make(map[string]*model.CodeTask, len(existingCodeTasks))
	for _, task := range existingCodeTasks {
		codeTasksBySlug[task.Slug] = task
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Result{}, fmt.Errorf("begin interview prep seed tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	created := 0
	updated := 0
	totalQuestions := 0
	for _, taskDef := range catalog.Tasks {
		var codeTaskID *uuid.UUID
		if taskDef.CodeTask != nil {
			codeTask, err := upsertInterviewPrepCodeTask(ctx, r, codeTasksBySlug, taskDef)
			if err != nil {
				return Result{}, err
			}
			codeTaskID = &codeTask.ID
		}

		taskID, wasCreated, err := upsertInterviewPrepTask(ctx, tx, taskDef, codeTaskID)
		if err != nil {
			return Result{}, err
		}
		if wasCreated {
			created++
		} else {
			updated++
		}
		if err := syncInterviewPrepQuestions(ctx, tx, taskID, taskDef); err != nil {
			return Result{}, err
		}
		totalQuestions += len(taskDef.Questions)
	}

	if err := tx.Commit(ctx); err != nil {
		return Result{}, fmt.Errorf("commit interview prep seed tx: %w", err)
	}
	appliedAt = time.Now().UTC()
	if err := r.record(ctx, interviewPrepSeedName, seedKindCatalog, checksum, appliedAt); err != nil {
		return Result{}, err
	}

	return Result{
		Name:      interviewPrepSeedName,
		Kind:      seedKindCatalog,
		Applied:   true,
		Message:   fmt.Sprintf("upserted %d interview-prep tasks and %d questions (%d created, %d updated)", len(catalog.Tasks), totalQuestions, created, updated),
		AppliedAt: appliedAt,
	}, nil
}

func upsertInterviewPrepTask(ctx context.Context, tx pgx.Tx, def InterviewPrepCatalogTask, codeTaskID *uuid.UUID) (uuid.UUID, bool, error) {
	now := time.Now().UTC()
	slug := strings.TrimSpace(def.Slug)
	taskID := uuid.NewSHA1(uuid.NameSpaceURL, []byte("interview-prep:"+slug))

	var existingID uuid.UUID
	err := tx.QueryRow(ctx, `SELECT id FROM interview_prep_tasks WHERE slug = $1`, slug).Scan(&existingID)
	if err != nil && err != pgx.ErrNoRows {
		return uuid.Nil, false, fmt.Errorf("load interview prep task %s: %w", slug, err)
	}
	created := err == pgx.ErrNoRows
	if !created {
		taskID = existingID
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO interview_prep_tasks (
			id, slug, title, statement, prep_type, language, company_tag, supported_languages, is_executable,
			execution_profile, runner_mode, duration_seconds, starter_code,
			reference_solution, code_task_id, is_active, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		ON CONFLICT (slug) DO UPDATE SET
			title = EXCLUDED.title,
			statement = EXCLUDED.statement,
			prep_type = EXCLUDED.prep_type,
			language = EXCLUDED.language,
			company_tag = EXCLUDED.company_tag,
			supported_languages = EXCLUDED.supported_languages,
			is_executable = EXCLUDED.is_executable,
			execution_profile = EXCLUDED.execution_profile,
			runner_mode = EXCLUDED.runner_mode,
			duration_seconds = EXCLUDED.duration_seconds,
			starter_code = EXCLUDED.starter_code,
			reference_solution = EXCLUDED.reference_solution,
			code_task_id = EXCLUDED.code_task_id,
			is_active = EXCLUDED.is_active,
			updated_at = EXCLUDED.updated_at
	`,
		taskID,
		slug,
		strings.TrimSpace(def.Title),
		strings.TrimSpace(def.Statement),
		normalizeInterviewPrepCatalogType(def.PrepType).String(),
		normalizeInterviewPrepCatalogLanguage(def.Language),
		normalizeInterviewPrepCompanyTag(def.CompanyTag),
		normalizeInterviewPrepSupportedLanguages(def),
		def.IsExecutable,
		normalizeInterviewPrepExecutionProfile(def.ExecutionProfile),
		normalizeInterviewPrepRunnerMode(def.RunnerMode),
		normalizeInterviewPrepDuration(def.DurationSeconds),
		strings.TrimSpace(def.StarterCode),
		strings.TrimSpace(def.ReferenceSolution),
		codeTaskID,
		def.IsActive,
		now,
		now,
	)
	if err != nil {
		return uuid.Nil, false, fmt.Errorf("upsert interview prep task %s: %w", slug, err)
	}
	return taskID, created, nil
}

func normalizeInterviewPrepCompanyTag(value string) string {
	return strings.TrimSpace(strings.ToLower(value))
}

func normalizeInterviewPrepSupportedLanguages(def InterviewPrepCatalogTask) []string {
	if len(def.SupportedLanguages) == 0 {
		return []string{normalizeInterviewPrepCatalogLanguage(def.Language)}
	}
	result := make([]string, 0, len(def.SupportedLanguages))
	seen := make(map[string]struct{}, len(def.SupportedLanguages))
	for _, language := range def.SupportedLanguages {
		normalized := normalizeInterviewPrepCatalogLanguage(language)
		if normalized == "" {
			continue
		}
		if _, ok := seen[normalized]; ok {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	if len(result) == 0 {
		return []string{normalizeInterviewPrepCatalogLanguage(def.Language)}
	}
	return result
}

func upsertInterviewPrepCodeTask(
	ctx context.Context,
	r *Runner,
	existing map[string]*model.CodeTask,
	def InterviewPrepCatalogTask,
) (*model.CodeTask, error) {
	spec := def.CodeTask
	if spec == nil {
		return nil, nil
	}

	task := buildInterviewPrepCodeTask(def, *spec)
	if current := existing[task.Slug]; current != nil {
		task.ID = current.ID
		updated, err := r.codeEditor.UpdateTask(ctx, task)
		if err != nil {
			return nil, fmt.Errorf("update interview prep code task %s: %w", task.Slug, err)
		}
		existing[task.Slug] = updated
		return updated, nil
	}

	created, err := r.codeEditor.CreateTask(ctx, task)
	if err != nil {
		return nil, fmt.Errorf("create interview prep code task %s: %w", task.Slug, err)
	}
	existing[task.Slug] = created
	return created, nil
}

func buildInterviewPrepCodeTask(def InterviewPrepCatalogTask, spec InterviewPrepCatalogCodeTask) *model.CodeTask {
	slug := strings.TrimSpace(spec.Slug)
	if slug == "" {
		slug = strings.TrimSpace(def.Slug) + "-exec"
	}
	taskID := uuid.NewSHA1(uuid.NameSpaceURL, []byte("interview-prep-code-task:"+slug))

	task := &model.CodeTask{
		ID:               taskID,
		Title:            firstNonEmpty(spec.Title, def.Title+" [Executable]"),
		Slug:             slug,
		Statement:        firstNonEmpty(spec.Statement, def.Statement),
		Difficulty:       model.TaskDifficultyFromString(firstNonEmpty(spec.Difficulty, "medium")),
		Topics:           append([]string{"interview-prep"}, spec.Topics...),
		StarterCode:      strings.TrimSpace(spec.StarterCode),
		Language:         model.ProgrammingLanguageFromString(firstNonEmpty(spec.Language, def.Language)),
		TaskType:         model.TaskTypeAlgorithm,
		ExecutionProfile: model.ExecutionProfileFromString(firstNonEmpty(spec.ExecutionProfile, def.ExecutionProfile)),
		RunnerMode:       model.RunnerModeFromString(firstNonEmpty(spec.RunnerMode, def.RunnerMode)),
		DurationSeconds:  normalizeInterviewPrepDuration(firstPositive(spec.DurationSeconds, def.DurationSeconds)),
		IsActive:         def.IsActive,
	}

	if task.ExecutionProfile.String() == "" {
		task.ExecutionProfile = model.ExecutionProfilePure
	}
	if task.RunnerMode.String() == "" {
		task.RunnerMode = model.RunnerModeFunctionIO
	}
	if task.Language.String() == "" {
		task.Language = model.ProgrammingLanguageGo
	}

	publicOrder := int32(1)
	hiddenOrder := int32(1)
	for index, c := range spec.Cases {
		testCase := &model.CodeTestCase{
			ID:             uuid.NewSHA1(taskID, []byte(fmt.Sprintf("case:%d", index))),
			TaskID:         taskID,
			Input:          normalizeSeedText(c.Input),
			ExpectedOutput: normalizeSeedText(c.Output),
			IsPublic:       c.IsPublic,
			Weight:         1,
		}
		if c.IsPublic {
			testCase.Order = publicOrder
			publicOrder++
			task.PublicTestCases = append(task.PublicTestCases, testCase)
		} else {
			testCase.Order = hiddenOrder
			hiddenOrder++
			task.HiddenTestCases = append(task.HiddenTestCases, testCase)
		}
	}

	return task
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func firstPositive(values ...int32) int32 {
	for _, value := range values {
		if value > 0 {
			return value
		}
	}
	return 0
}

func syncInterviewPrepQuestions(ctx context.Context, tx pgx.Tx, taskID uuid.UUID, def InterviewPrepCatalogTask) error {
	positions := make([]int32, 0, len(def.Questions))
	for _, question := range def.Questions {
		position := question.Position
		if position < 1 {
			position = int32(len(positions) + 1)
		}
		positions = append(positions, position)

		_, err := tx.Exec(ctx, `
			INSERT INTO interview_prep_questions (
				id, task_id, position, prompt, answer, created_at, updated_at
			)
			VALUES ($1,$2,$3,$4,$5,$6,$7)
			ON CONFLICT (task_id, position) DO UPDATE SET
				prompt = EXCLUDED.prompt,
				answer = EXCLUDED.answer,
				updated_at = EXCLUDED.updated_at
		`,
			uuid.NewSHA1(taskID, []byte(fmt.Sprintf("question:%d", position))),
			taskID,
			position,
			strings.TrimSpace(question.Prompt),
			strings.TrimSpace(question.Answer),
			time.Now().UTC(),
			time.Now().UTC(),
		)
		if err != nil {
			return fmt.Errorf("upsert interview prep question task=%s position=%d: %w", taskID, position, err)
		}
	}

	_, err := tx.Exec(ctx, `
		DELETE FROM interview_prep_questions
		WHERE task_id = $1
		  AND NOT (position = ANY($2))
	`, taskID, positions)
	if err != nil {
		return fmt.Errorf("delete stale interview prep questions task=%s: %w", taskID, err)
	}
	return nil
}

func normalizeInterviewPrepCatalogType(value string) model.InterviewPrepType {
	if prepType := model.InterviewPrepTypeFromString(strings.TrimSpace(value)); prepType != model.InterviewPrepTypeUnknown {
		return prepType
	}
	return model.InterviewPrepTypeAlgorithm
}

func normalizeInterviewPrepCatalogLanguage(value string) string {
	if strings.TrimSpace(value) == "" {
		return "go"
	}
	return strings.TrimSpace(value)
}

func normalizeInterviewPrepExecutionProfile(value string) string {
	if strings.TrimSpace(value) == "" {
		return "pure"
	}
	return strings.TrimSpace(value)
}

func normalizeInterviewPrepRunnerMode(value string) string {
	if strings.TrimSpace(value) == "" {
		return "function_io"
	}
	return strings.TrimSpace(value)
}

func normalizeInterviewPrepDuration(value int32) int32 {
	if value <= 0 {
		return 1800
	}
	return value
}
