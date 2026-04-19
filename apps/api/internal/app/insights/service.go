// Package insights generates and serves ADR-002 personalized
// recommendations. The current generator is deterministic — it picks
// strengths/gaps from the user's competency scores. The LLM-backed
// generator (calling aireview via the registry mentor) lands when the
// prompt + cost budget are signed off.
package insights

import (
	"context"
	"fmt"
	"sort"

	"github.com/google/uuid"

	insightsdata "api/internal/data/insights"
	"api/internal/model"
)

// ProgressReader returns the user's competency snapshot used as the
// generator's input. Mirrors the shape produced by profile/progress.
type ProgressReader interface {
	GetProfileProgress(ctx context.Context, userID uuid.UUID) (*model.ProfileProgress, error)
}

type Service struct {
	progress ProgressReader
	repo     *insightsdata.Repo
}

func New(progress ProgressReader, repo *insightsdata.Repo) *Service {
	return &Service{progress: progress, repo: repo}
}

// GetOrGenerate returns the cached insight for the user, generating one
// on the fly if the row is missing. Cron callers should prefer Generate
// to refresh existing rows on a schedule.
func (s *Service) GetOrGenerate(ctx context.Context, userID uuid.UUID) (*insightsdata.Insight, error) {
	ins, err := s.repo.Get(ctx, userID)
	if err == nil {
		return ins, nil
	}
	// Missing → generate fresh and persist.
	fresh, genErr := s.Generate(ctx, userID)
	if genErr != nil {
		return nil, fmt.Errorf("generate insight: %w", genErr)
	}
	if writeErr := s.repo.Upsert(ctx, fresh); writeErr != nil {
		// Persist failure is non-fatal: we can still return the in-memory
		// insight so the page renders. Cron will retry next tick.
		return fresh, nil
	}
	return fresh, nil
}

// Generate produces a fresh insight without writing it. Used by the cron
// to compare against the previous version before persisting.
func (s *Service) Generate(ctx context.Context, userID uuid.UUID) (*insightsdata.Insight, error) {
	progress, err := s.progress.GetProfileProgress(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("read progress: %w", err)
	}
	return buildDeterministicInsight(userID, progress), nil
}

// buildDeterministicInsight produces stable, rule-based recommendations
// from the competency snapshot. Strengths = top-3 scoring competencies;
// gaps = bottom-3 with at least one practice attempt; next_steps mirrors
// the gaps with a concrete CTA URL.
func buildDeterministicInsight(userID uuid.UUID, progress *model.ProfileProgress) *insightsdata.Insight {
	if progress == nil {
		return &insightsdata.Insight{
			UserID:  userID,
			Summary: "Поделай несколько практик, чтобы я смог дать рекомендации.",
			Source:  "deterministic",
		}
	}

	competencies := append([]*model.ProfileCompetency(nil), progress.Competencies...)
	sort.SliceStable(competencies, func(i, j int) bool {
		return competencies[i].Score > competencies[j].Score
	})

	strengths := make([]insightsdata.Item, 0, 3)
	for _, c := range competencies {
		if c.Score > 0 && len(strengths) < 3 {
			strengths = append(strengths, insightsdata.Item{
				Title:       c.Label,
				Description: fmt.Sprintf("Уверенность %d%% — закрепляй сложные задачи.", c.Score),
			})
		}
	}

	gaps := make([]insightsdata.Item, 0, 3)
	steps := make([]insightsdata.Item, 0, 3)
	// Iterate from weakest end. Skip competencies with zero attempts —
	// "weak" without practice is just unfamiliar, not a gap.
	for i := len(competencies) - 1; i >= 0 && len(gaps) < 3; i-- {
		c := competencies[i]
		if c.PracticeScore <= 0 || c.Score >= 75 {
			continue
		}
		gaps = append(gaps, insightsdata.Item{
			Title:       c.Label,
			Description: fmt.Sprintf("Только %d%% — добавь 3–5 практик в этой области.", c.Score),
		})
		steps = append(steps, insightsdata.Item{
			Title:       "Тренировка: " + c.Label,
			Description: "Запусти 30-минутную сессию с фокусом на эту тему.",
			ActionURL:   "/training/" + c.Key,
		})
	}

	summary := buildSummary(&progress.Overview, len(strengths), len(gaps))
	return &insightsdata.Insight{
		UserID:       userID,
		Summary:      summary,
		TopStrengths: strengths,
		TopGaps:      gaps,
		NextSteps:    steps,
		Source:       "deterministic",
	}
}

func buildSummary(ov *model.ProfileProgressOverview, nStrengths, nGaps int) string {
	if ov == nil {
		return "Я готовлю карту твоих навыков — поделай ещё немного практик."
	}
	if ov.PracticeSessions == 0 {
		return "Старт пути: пройди первую практику, и я подсвечу слабые места."
	}
	switch {
	case nGaps == 0 && nStrengths >= 3:
		return fmt.Sprintf("Уровень %d. Сильных тем %d — пора брать темы посложнее.", ov.Level, nStrengths)
	case nGaps > 0:
		return fmt.Sprintf("Уровень %d. Подтяни %d слабых тем — список ниже.", ov.Level, nGaps)
	default:
		return fmt.Sprintf("Уровень %d, серия %d дней. Двигайся в темпе!", ov.Level, ov.CurrentStreakDays)
	}
}
