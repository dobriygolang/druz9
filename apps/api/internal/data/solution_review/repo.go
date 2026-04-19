package solution_review

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/model"
	"api/internal/storage/postgres"
)

var ErrReviewNotFound = errors.New("solution review not found")

// Repo provides data access for solution reviews.
type Repo struct {
	data *postgres.Store
}

// NewRepo creates a new solution review repository.
func NewRepo(dataLayer *postgres.Store) *Repo {
	return &Repo{data: dataLayer}
}

// Create inserts a new solution review (Level 1 data, status=pending).
// AI skill signals are populated later in UpdateAIReview, not here.
func (r *Repo) Create(ctx context.Context, review *model.SolutionReview) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO solution_reviews (
			id, user_id, submission_id, source_type, task_id,
			source_code, language,
			is_correct, attempt_number, solve_time_ms, median_time_ms, passed_count, total_count,
			status, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
		review.ID, review.UserID, review.SubmissionID, review.SourceType, review.TaskID,
		review.SourceCode, review.Language,
		review.IsCorrect, review.AttemptNumber, review.SolveTimeMs, review.MedianTimeMs, review.PassedCount, review.TotalCount,
		review.Status,
	)
	if err != nil {
		return fmt.Errorf("create solution review: %w", err)
	}
	return nil
}

// UpdateAIReview fills in the Level 2 AI review fields.
func (r *Repo) UpdateAIReview(ctx context.Context, reviewID uuid.UUID, ai *model.SolutionReview) error {
	skillSignals, err := json.Marshal(ai.AISkillSignals)
	if err != nil {
		return fmt.Errorf("marshal ai skill signals: %w", err)
	}
	if string(skillSignals) == "null" {
		skillSignals = []byte("{}")
	}

	_, err = r.data.DB.Exec(ctx, `
		UPDATE solution_reviews SET
			status = $2,
			ai_verdict = $3,
			ai_time_complexity = $4,
			ai_space_complexity = $5,
			ai_pattern = $6,
			ai_strengths = $7,
			ai_weaknesses = $8,
			ai_hint = $9,
			ai_skill_signals = $10,
			ai_provider = $11,
			ai_model = $12,
			opponent_submission_id = $13,
			comparison_summary = $14
		WHERE id = $1`,
		reviewID, ai.Status,
		nilIfEmpty(string(ai.AIVerdict)), nilIfEmpty(ai.AITimeComplexity), nilIfEmpty(ai.AISpaceComplexity),
		nilIfEmpty(ai.AIPattern),
		ai.AIStrengths, ai.AIWeaknesses,
		nilIfEmpty(ai.AIHint), skillSignals,
		nilIfEmpty(ai.AIProvider), nilIfEmpty(ai.AIModel),
		ai.OpponentSubmissionID, nilIfEmpty(ai.ComparisonSummary),
	)
	if err != nil {
		return fmt.Errorf("update ai review: %w", err)
	}
	return nil
}

// MarkFailed sets the review status to failed.
func (r *Repo) MarkFailed(ctx context.Context, reviewID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `UPDATE solution_reviews SET status = 'failed' WHERE id = $1`, reviewID)
	if err != nil {
		return fmt.Errorf("mark review failed: %w", err)
	}
	return nil
}

// GetBySubmission returns the review for a given submission.
func (r *Repo) GetBySubmission(ctx context.Context, submissionID uuid.UUID) (*model.SolutionReview, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT `+reviewColumns+`
		FROM solution_reviews WHERE submission_id = $1
		ORDER BY created_at DESC LIMIT 1`,
		submissionID,
	)
	return scanReview(row)
}

// GetByID returns a review by its ID.
func (r *Repo) GetByID(ctx context.Context, id uuid.UUID) (*model.SolutionReview, error) {
	row := r.data.DB.QueryRow(ctx, `
		SELECT `+reviewColumns+`
		FROM solution_reviews WHERE id = $1`,
		id,
	)
	return scanReview(row)
}

// CountUserAttempts counts how many reviews exist for a user+task combination.
func (r *Repo) CountUserAttempts(ctx context.Context, userID, taskID uuid.UUID) (int, error) {
	var count int
	err := r.data.DB.QueryRow(ctx,
		`SELECT COUNT(*) FROM solution_reviews WHERE user_id = $1 AND task_id = $2`,
		userID, taskID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count user attempts: %w", err)
	}
	return count, nil
}

// GetTaskStats returns cached solve stats for a task.
func (r *Repo) GetTaskStats(ctx context.Context, taskID uuid.UUID) (*model.TaskStats, error) {
	var stats model.TaskStats
	err := r.data.DB.QueryRow(ctx,
		`SELECT task_id, median_solve_time_ms, total_solves, updated_at FROM task_stats WHERE task_id = $1`,
		taskID,
	).Scan(&stats.TaskID, &stats.MedianSolveTimeMs, &stats.TotalSolves, &stats.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return &model.TaskStats{TaskID: taskID}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get task stats: %w", err)
	}
	return &stats, nil
}

// UpsertTaskStats updates or creates aggregated task statistics.
func (r *Repo) UpsertTaskStats(ctx context.Context, taskID uuid.UUID) error {
	_, err := r.data.DB.Exec(ctx, `
		INSERT INTO task_stats (task_id, median_solve_time_ms, total_solves, updated_at)
		SELECT
			$1,
			COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY solve_time_ms), 0)::BIGINT,
			COUNT(*),
			NOW()
		FROM solution_reviews
		WHERE task_id = $1 AND is_correct = TRUE AND solve_time_ms > 0
		ON CONFLICT (task_id) DO UPDATE SET
			median_solve_time_ms = EXCLUDED.median_solve_time_ms,
			total_solves = EXCLUDED.total_solves,
			updated_at = NOW()`,
		taskID,
	)
	if err != nil {
		return fmt.Errorf("upsert task stats: %w", err)
	}
	return nil
}

// ListByUser returns the most recent reviews for a user.
func (r *Repo) ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]*model.SolutionReview, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	rows, err := r.data.DB.Query(ctx, `
		SELECT `+reviewColumns+`
		FROM solution_reviews WHERE user_id = $1
		ORDER BY created_at DESC LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("list user reviews: %w", err)
	}
	defer rows.Close()

	var reviews []*model.SolutionReview
	for rows.Next() {
		rev, err := scanReview(rows)
		if err != nil {
			return nil, err
		}
		reviews = append(reviews, rev)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate reviews: %w", err)
	}
	return reviews, nil
}

const reviewColumns = `
	id, user_id, submission_id, source_type, task_id,
	source_code, language,
	is_correct, attempt_number, solve_time_ms, median_time_ms, passed_count, total_count,
	status,
	ai_verdict, ai_time_complexity, ai_space_complexity, ai_pattern,
	ai_strengths, ai_weaknesses, ai_hint, ai_skill_signals,
	ai_provider, ai_model,
	opponent_submission_id, comparison_summary,
	created_at
`

type scannable interface {
	Scan(dest ...any) error
}

func scanReview(s scannable) (*model.SolutionReview, error) {
	var rev model.SolutionReview
	var aiVerdict, aiTimeC, aiSpaceC, aiPattern, aiHint, aiProvider, aiModel, compSummary *string
	var skillSignalsRaw []byte

	err := s.Scan(
		&rev.ID, &rev.UserID, &rev.SubmissionID, &rev.SourceType, &rev.TaskID,
		&rev.SourceCode, &rev.Language,
		&rev.IsCorrect, &rev.AttemptNumber, &rev.SolveTimeMs, &rev.MedianTimeMs, &rev.PassedCount, &rev.TotalCount,
		&rev.Status,
		&aiVerdict, &aiTimeC, &aiSpaceC, &aiPattern,
		&rev.AIStrengths, &rev.AIWeaknesses, &aiHint, &skillSignalsRaw,
		&aiProvider, &aiModel,
		&rev.OpponentSubmissionID, &compSummary,
		&rev.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrReviewNotFound
		}
		return nil, fmt.Errorf("scan review: %w", err)
	}

	if aiVerdict != nil {
		rev.AIVerdict = model.AIVerdict(*aiVerdict)
	}
	if aiTimeC != nil {
		rev.AITimeComplexity = *aiTimeC
	}
	if aiSpaceC != nil {
		rev.AISpaceComplexity = *aiSpaceC
	}
	if aiPattern != nil {
		rev.AIPattern = *aiPattern
	}
	if aiHint != nil {
		rev.AIHint = *aiHint
	}
	if aiProvider != nil {
		rev.AIProvider = *aiProvider
	}
	if aiModel != nil {
		rev.AIModel = *aiModel
	}
	if compSummary != nil {
		rev.ComparisonSummary = *compSummary
	}
	if len(skillSignalsRaw) > 0 {
		_ = json.Unmarshal(skillSignalsRaw, &rev.AISkillSignals)
	}

	return &rev, nil
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
