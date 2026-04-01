package seeds

import (
	"context"
	"fmt"
	"strings"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const interviewPrepSeedName = "interview_prep_pack"
const interviewPrepCatalogPath = "scripts/seeds/catalogs/interview_prep.json"
const interviewPrepSeedVersion = "v1"

func (r *Runner) runInterviewPrep(ctx context.Context) (Result, error) {
	catalog, rawCatalog, err := loadInterviewPrepCatalog(interviewPrepCatalogPath)
	if err != nil {
		return Result{}, err
	}

	checksum := digest(append(rawCatalog, []byte("|"+interviewPrepSeedVersion)...))
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

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Result{}, fmt.Errorf("begin interview prep seed tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	created := 0
	updated := 0
	totalQuestions := 0
	for _, taskDef := range catalog.Tasks {
		taskID, wasCreated, err := upsertInterviewPrepTask(ctx, tx, taskDef)
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

func upsertInterviewPrepTask(ctx context.Context, tx pgx.Tx, def InterviewPrepCatalogTask) (uuid.UUID, bool, error) {
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
			id, slug, title, statement, prep_type, language, is_executable,
			execution_profile, runner_mode, duration_seconds, starter_code,
			reference_solution, is_active, created_at, updated_at
		)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		ON CONFLICT (slug) DO UPDATE SET
			title = EXCLUDED.title,
			statement = EXCLUDED.statement,
			prep_type = EXCLUDED.prep_type,
			language = EXCLUDED.language,
			is_executable = EXCLUDED.is_executable,
			execution_profile = EXCLUDED.execution_profile,
			runner_mode = EXCLUDED.runner_mode,
			duration_seconds = EXCLUDED.duration_seconds,
			starter_code = EXCLUDED.starter_code,
			reference_solution = EXCLUDED.reference_solution,
			is_active = EXCLUDED.is_active,
			updated_at = EXCLUDED.updated_at
	`,
		taskID,
		slug,
		strings.TrimSpace(def.Title),
		strings.TrimSpace(def.Statement),
		normalizeInterviewPrepCatalogType(def.PrepType).String(),
		normalizeInterviewPrepCatalogLanguage(def.Language),
		def.IsExecutable,
		normalizeInterviewPrepExecutionProfile(def.ExecutionProfile),
		normalizeInterviewPrepRunnerMode(def.RunnerMode),
		normalizeInterviewPrepDuration(def.DurationSeconds),
		strings.TrimSpace(def.StarterCode),
		strings.TrimSpace(def.ReferenceSolution),
		def.IsActive,
		now,
		now,
	)
	if err != nil {
		return uuid.Nil, false, fmt.Errorf("upsert interview prep task %s: %w", slug, err)
	}
	return taskID, created, nil
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
