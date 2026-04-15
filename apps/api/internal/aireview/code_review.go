package aireview

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// CodeReviewRequest holds everything needed for a post-solve code review.
type CodeReviewRequest struct {
	// Task context
	TaskTitle             string
	TaskStatement         string
	TaskPattern           string // known pattern from task metadata (may be empty)
	TaskOptimalTime       string // e.g. "O(n)"
	TaskOptimalSpace      string // e.g. "O(1)"
	TaskDifficulty        string // "easy", "medium", "hard"

	// Candidate submission
	CandidateCode     string
	CandidateLanguage string
	SolveTimeMs       int64
	AttemptNumber     int
	PassedCount       int32
	TotalCount        int32

	// Duel context (optional, for Level 3 comparison)
	OpponentCode     string
	OpponentLanguage string
}

// CodeReview is the structured AI response for post-solve review.
type CodeReview struct {
	Provider string `json:"provider"`
	Model    string `json:"model"`

	// Verdict: optimal, good, suboptimal, brute_force
	Verdict string `json:"verdict"`

	// Complexity analysis
	TimeComplexity  string `json:"timeComplexity"`
	SpaceComplexity string `json:"spaceComplexity"`

	// Pattern classification (from fixed set)
	Pattern string `json:"pattern"`

	// Qualitative feedback
	Strengths  []string `json:"strengths"`
	Weaknesses []string `json:"weaknesses"`
	Hint       string   `json:"hint"`

	// Skill signals: {"arrays": "strong", "dp": "weak"}
	SkillSignals map[string]string `json:"skillSignals"`

	// Duel comparison (only if opponent code was provided)
	Comparison string `json:"comparison"`
}

func buildCodeReviewPrompt(req CodeReviewRequest) string {
	var b strings.Builder

	b.WriteString("Ты — строгий code reviewer для платформы подготовки к техническим собеседованиям.\n")
	b.WriteString("Кандидат решил задачу. Проанализируй решение и верни ТОЛЬКО валидный JSON.\n\n")

	b.WriteString("Формат ответа (JSON):\n")
	b.WriteString("{\n")
	b.WriteString("  \"verdict\": \"optimal\" | \"good\" | \"suboptimal\" | \"brute_force\",\n")
	b.WriteString("  \"timeComplexity\": \"O(...)\",\n")
	b.WriteString("  \"spaceComplexity\": \"O(...)\",\n")
	b.WriteString("  \"pattern\": \"<один из: two_pointers, sliding_window, binary_search, bfs, dfs, dynamic_programming, greedy, backtracking, sorting, hashing, stack, queue, heap, linked_list, tree, graph, trie, union_find, bit_manipulation, math, string, matrix, prefix_sum, monotonic_stack, topological_sort, segment_tree, divide_and_conquer, simulation, other>\",\n")
	b.WriteString("  \"strengths\": [\"...\"],\n")
	b.WriteString("  \"weaknesses\": [\"...\"],\n")
	b.WriteString("  \"hint\": \"одно предложение — как улучшить до оптимального подхода\",\n")
	b.WriteString("  \"skillSignals\": {\"<topic>\": \"strong\" | \"moderate\" | \"weak\"},\n")
	b.WriteString("  \"comparison\": \"<сравнение с оппонентом, если оппонент есть, иначе пустая строка>\"\n")
	b.WriteString("}\n\n")

	b.WriteString("Правила:\n")
	b.WriteString("- Все строки на русском языке.\n")
	b.WriteString("- verdict: 'optimal' если сложность совпадает с оптимальной и код чистый; 'good' если сложность оптимальна но есть мелкие замечания; 'suboptimal' если можно значительно улучшить; 'brute_force' если решение грубой силой.\n")
	b.WriteString("- В strengths — только реальные заслуги. Не хвали за банальности.\n")
	b.WriteString("- В weaknesses — конкретные проблемы: лишние аллокации, пропущенные edge cases, избыточная сложность.\n")
	b.WriteString("- hint должен подсказывать направление лучшего подхода, НЕ давать готовое решение.\n")
	b.WriteString("- skillSignals: выдели 2-4 ключевых навыка, задействованных в задаче.\n")
	b.WriteString("- Если оппонент не предоставлен, comparison должен быть пустой строкой.\n")
	b.WriteString("- Если оппонент предоставлен, сравни подходы, сложности и стиль кода.\n\n")

	b.WriteString("---\n\n")

	b.WriteString("Задача: ")
	b.WriteString(truncate(strings.TrimSpace(req.TaskTitle), 300))
	b.WriteString("\n\nУсловие:\n")
	b.WriteString(truncate(strings.TrimSpace(req.TaskStatement), maxPromptTaskStatementChars))

	if req.TaskDifficulty != "" {
		b.WriteString("\n\nСложность: ")
		b.WriteString(req.TaskDifficulty)
	}

	if req.TaskPattern != "" {
		b.WriteString("\nИзвестный паттерн: ")
		b.WriteString(req.TaskPattern)
	}

	if req.TaskOptimalTime != "" || req.TaskOptimalSpace != "" {
		b.WriteString("\nОптимальная сложность: ")
		if req.TaskOptimalTime != "" {
			b.WriteString("time ")
			b.WriteString(req.TaskOptimalTime)
		}
		if req.TaskOptimalSpace != "" {
			if req.TaskOptimalTime != "" {
				b.WriteString(", ")
			}
			b.WriteString("space ")
			b.WriteString(req.TaskOptimalSpace)
		}
	}

	b.WriteString(fmt.Sprintf("\n\nПопытка #%d. Время решения: %d мс. Тесты: %d/%d.",
		req.AttemptNumber, req.SolveTimeMs, req.PassedCount, req.TotalCount))

	b.WriteString("\n\nРешение кандидата")
	if req.CandidateLanguage != "" {
		b.WriteString(" (")
		b.WriteString(req.CandidateLanguage)
		b.WriteString(")")
	}
	b.WriteString(":\n")
	b.WriteString(truncate(strings.TrimSpace(req.CandidateCode), maxPromptCandidateCodeChars))

	if req.OpponentCode != "" {
		b.WriteString("\n\nРешение оппонента")
		if req.OpponentLanguage != "" {
			b.WriteString(" (")
			b.WriteString(req.OpponentLanguage)
			b.WriteString(")")
		}
		b.WriteString(":\n")
		b.WriteString(truncate(strings.TrimSpace(req.OpponentCode), maxPromptCandidateCodeChars))
	}

	return b.String()
}

func parseCodeReviewJSON(raw string) (*CodeReview, error) {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var payload map[string]any
	if err := json.Unmarshal([]byte(cleaned), &payload); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidResponse, err)
	}

	review := CodeReview{
		Verdict:         normalizeVerdict(toStringValue(payload["verdict"])),
		TimeComplexity:  toStringValue(payload["timeComplexity"]),
		SpaceComplexity: toStringValue(payload["spaceComplexity"]),
		Pattern:         normalizePattern(toStringValue(payload["pattern"])),
		Strengths:       normalizeStringList(payload["strengths"]),
		Weaknesses:      normalizeStringList(payload["weaknesses"]),
		Hint:            strings.TrimSpace(toStringValue(payload["hint"])),
		Comparison:      strings.TrimSpace(toStringValue(payload["comparison"])),
	}

	// Parse skill signals
	if signals, ok := payload["skillSignals"].(map[string]any); ok {
		review.SkillSignals = make(map[string]string, len(signals))
		for k, v := range signals {
			if s := strings.TrimSpace(toStringValue(v)); s != "" {
				review.SkillSignals[strings.TrimSpace(k)] = s
			}
		}
	}

	return &review, nil
}

var validVerdicts = map[string]bool{
	"optimal": true, "good": true, "suboptimal": true, "brute_force": true,
}

func normalizeVerdict(v string) string {
	v = strings.ToLower(strings.TrimSpace(v))
	if validVerdicts[v] {
		return v
	}
	return "suboptimal"
}

var validPatterns = map[string]bool{
	"two_pointers": true, "sliding_window": true, "binary_search": true,
	"bfs": true, "dfs": true, "dynamic_programming": true,
	"greedy": true, "backtracking": true, "sorting": true,
	"hashing": true, "stack": true, "queue": true, "heap": true,
	"linked_list": true, "tree": true, "graph": true, "trie": true,
	"union_find": true, "bit_manipulation": true, "math": true,
	"string": true, "matrix": true, "prefix_sum": true,
	"monotonic_stack": true, "topological_sort": true,
	"segment_tree": true, "divide_and_conquer": true,
	"simulation": true, "other": true,
}

func normalizePattern(p string) string {
	p = strings.ToLower(strings.TrimSpace(p))
	if validPatterns[p] {
		return p
	}
	return "other"
}

// ReviewCode is implemented on each provider (gemini, openai_compatible).
// We add it as a standalone function that uses the existing Reviewer's call method.

// CodeReviewer extends the base Reviewer with post-solve code review.
type CodeReviewer interface {
	ReviewCode(ctx context.Context, req CodeReviewRequest) (*CodeReview, error)
}

// Ensure concrete providers implement CodeReviewer via adapter.
type codeReviewerAdapter struct {
	callFn   func(ctx context.Context, model string, prompt string, temperature float64) (string, error)
	provider string
	model    string
}

func (a *codeReviewerAdapter) ReviewCode(ctx context.Context, req CodeReviewRequest) (*CodeReview, error) {
	prompt := buildCodeReviewPrompt(req)

	raw, err := a.callFn(ctx, a.model, prompt, 0.2)
	if err != nil {
		return nil, err
	}

	review, err := parseCodeReviewJSON(raw)
	if err != nil {
		return nil, err
	}
	review.Provider = a.provider
	review.Model = a.model
	return review, nil
}

// NewCodeReviewer wraps an existing Reviewer to also provide CodeReviewer capability.
// Returns nil if the underlying provider doesn't support it.
func NewCodeReviewer(cfg Config) CodeReviewer {
	switch strings.ToLower(strings.TrimSpace(cfg.Provider)) {
	case "gemini":
		g := &geminiReviewer{
			baseURL: strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/"),
			apiKey:  strings.TrimSpace(cfg.APIKey),
			model:   strings.TrimSpace(cfg.Model),
			client:  &http.Client{Timeout: timeoutOrDefault(cfg.Timeout)},
		}
		return &codeReviewerAdapter{
			callFn: func(ctx context.Context, model, prompt string, temp float64) (string, error) {
				parts := []map[string]any{{"text": prompt}}
				return g.call(ctx, model, parts, temp)
			},
			provider: "gemini",
			model:    g.model,
		}
	case "openai_compatible":
		o := &openAICompatibleReviewer{
			baseURL: strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/"),
			apiKey:  strings.TrimSpace(cfg.APIKey),
			model:   strings.TrimSpace(cfg.Model),
			client:  &http.Client{Timeout: timeoutOrDefault(cfg.Timeout)},
		}
		return &codeReviewerAdapter{
			callFn: func(ctx context.Context, model, prompt string, temp float64) (string, error) {
				content := []map[string]any{{"type": "text", "text": prompt}}
				return o.call(ctx, model, content, temp)
			},
			provider: "openai_compatible",
			model:    o.model,
		}
	default:
		return &noopCodeReviewer{}
	}
}

type noopCodeReviewer struct{}

func (noopCodeReviewer) ReviewCode(context.Context, CodeReviewRequest) (*CodeReview, error) {
	return nil, ErrNotConfigured
}
