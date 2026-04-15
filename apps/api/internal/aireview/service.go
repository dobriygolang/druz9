package aireview

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode"
)

var (
	ErrNotConfigured       = errors.New("ai review provider is not configured")
	ErrUnsupportedProvider = errors.New("unsupported ai review provider")
	ErrInvalidResponse     = errors.New("invalid ai review response")
	ErrVisionUnsupported   = errors.New("ai review model does not support image input")
)

type Config struct {
	Provider string
	BaseURL  string
	APIKey   string
	Model    string
	Timeout  time.Duration
}

type SystemDesignReviewRequest struct {
	ModelOverride  string
	TaskTitle      string
	Statement      string
	Notes          string
	Components     string
	APIs           string
	DatabaseSchema string
	Traffic        string
	Reliability    string
	ImageBytes     []byte
	ImageMIME      string
	ImageName      string
}

type InterviewSolutionReviewRequest struct {
	ModelOverride     string
	StageKind         string
	TaskTitle         string
	Statement         string
	ReferenceSolution string
	CandidateLanguage string
	CandidateCode     string
	CandidateNotes    string
}

type InterviewSolutionReview struct {
	Provider          string   `json:"provider"`
	Model             string   `json:"model"`
	Score             int      `json:"score"`
	Summary           string   `json:"summary"`
	Strengths         []string `json:"strengths"`
	Issues            []string `json:"issues"`
	FollowUpQuestions []string `json:"followUpQuestions"`
	IsRelevant        bool     `json:"isRelevant"`
	IsPassing         bool     `json:"isPassing"`
}

type InterviewAnswerReviewRequest struct {
	ModelOverride   string
	Topic           string
	TaskTitle       string
	QuestionPrompt  string
	ReferenceAnswer string
	CandidateAnswer string
}

type InterviewAnswerReview struct {
	Provider   string   `json:"provider"`
	Model      string   `json:"model"`
	Score      int      `json:"score"`
	Summary    string   `json:"summary"`
	Gaps       []string `json:"gaps"`
	IsRelevant bool     `json:"isRelevant"`
	IsPassing  bool     `json:"isPassing"`
}

type SystemDesignReview struct {
	Provider          string   `json:"provider"`
	Model             string   `json:"model"`
	Score             int      `json:"score"`
	Summary           string   `json:"summary"`
	Strengths         []string `json:"strengths"`
	Issues            []string `json:"issues"`
	MissingTopics     []string `json:"missingTopics"`
	FollowUpQuestions []string `json:"followUpQuestions"`
	Disclaimer        string   `json:"disclaimer"`
	IsRelevant        bool     `json:"isRelevant"`
	IsPassing         bool     `json:"isPassing"`
}

type Reviewer interface {
	ReviewSystemDesign(ctx context.Context, req SystemDesignReviewRequest) (*SystemDesignReview, error)
	ReviewInterviewSolution(ctx context.Context, req InterviewSolutionReviewRequest) (*InterviewSolutionReview, error)
	ReviewInterviewAnswer(ctx context.Context, req InterviewAnswerReviewRequest) (*InterviewAnswerReview, error)
}

func New(cfg Config) Reviewer {
	switch strings.ToLower(strings.TrimSpace(cfg.Provider)) {
	case "":
		return noopReviewer{}
	case "gemini":
		return &geminiReviewer{
			baseURL: strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/"),
			apiKey:  strings.TrimSpace(cfg.APIKey),
			model:   strings.TrimSpace(cfg.Model),
			client:  &http.Client{Timeout: timeoutOrDefault(cfg.Timeout)},
		}
	case "openai_compatible":
		return &openAICompatibleReviewer{
			baseURL: strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/"),
			apiKey:  strings.TrimSpace(cfg.APIKey),
			model:   strings.TrimSpace(cfg.Model),
			client:  &http.Client{Timeout: timeoutOrDefault(cfg.Timeout)},
		}
	default:
		return unsupportedReviewer{provider: cfg.Provider}
	}
}

type noopReviewer struct{}

func (noopReviewer) ReviewSystemDesign(context.Context, SystemDesignReviewRequest) (*SystemDesignReview, error) {
	return nil, ErrNotConfigured
}

func (noopReviewer) ReviewInterviewSolution(context.Context, InterviewSolutionReviewRequest) (*InterviewSolutionReview, error) {
	return nil, ErrNotConfigured
}

func (noopReviewer) ReviewInterviewAnswer(context.Context, InterviewAnswerReviewRequest) (*InterviewAnswerReview, error) {
	return nil, ErrNotConfigured
}

type unsupportedReviewer struct {
	provider string
}

func (u unsupportedReviewer) ReviewSystemDesign(context.Context, SystemDesignReviewRequest) (*SystemDesignReview, error) {
	return nil, fmt.Errorf("%w: %s", ErrUnsupportedProvider, u.provider)
}

func (u unsupportedReviewer) ReviewInterviewSolution(context.Context, InterviewSolutionReviewRequest) (*InterviewSolutionReview, error) {
	return nil, fmt.Errorf("%w: %s", ErrUnsupportedProvider, u.provider)
}

func (u unsupportedReviewer) ReviewInterviewAnswer(context.Context, InterviewAnswerReviewRequest) (*InterviewAnswerReview, error) {
	return nil, fmt.Errorf("%w: %s", ErrUnsupportedProvider, u.provider)
}

// --- Prompt builders ---

func buildSystemDesignPrompt(req SystemDesignReviewRequest) string {
	var b strings.Builder
	b.WriteString("Ты проводишь строгий предварительный review ответа кандидата по system design.\n")
	b.WriteString("На входе могут быть изображение схемы и структурированные поля с пояснениями кандидата.\n")
	b.WriteString("Верни только валидный JSON с полями: score, summary, strengths, issues, missingTopics, followUpQuestions, disclaimer, isRelevant, isPassing.\n")
	b.WriteString("Все строки и элементы массивов должны быть только на русском языке.\n")
	b.WriteString("Score должен быть целым числом от 1 до 10.\n")
	b.WriteString("Оценивай архитектурное качество, а не красоту картинки.\n")
	b.WriteString("Не додумывай детали за кандидата. Если тезис не подтверждается схемой или текстом, считай его отсутствующим.\n")
	b.WriteString("Если изображения нет, опирайся только на текстовые поля и явно укажи ограничения такой оценки.\n")
	b.WriteString("Если текстовые поля пустые, шаблонные, бессодержательные или не объясняют решение, считай их отсутствующими.\n")
	b.WriteString("Не хвали кандидата за сам факт заполнения полей. В strengths должны попадать только подтверждённые инженерные решения.\n")
	b.WriteString("Если схема нерелевантна задаче или не похожа на архитектурную диаграмму, не выдумывай систему и ставь низкую оценку.\n")
	b.WriteString("Если вход слабый или нерелевантный, прямо скажи это в summary и issues.\n\n")
	b.WriteString("Если ответ нерелевантен, бессодержателен, состоит из случайного текста или не покрывает задачу, обязательно выставь isRelevant=false, isPassing=false и score не выше 2.\n\n")
	b.WriteString("Название задачи:\n")
	b.WriteString(strings.TrimSpace(req.TaskTitle))
	b.WriteString("\n\nУсловие задачи:\n")
	b.WriteString(strings.TrimSpace(req.Statement))
	if notes := strings.TrimSpace(req.Notes); notes != "" {
		b.WriteString("\n\nЗаметки кандидата:\n")
		b.WriteString(notes)
	}
	if components := strings.TrimSpace(req.Components); components != "" {
		b.WriteString("\n\nЗаявленные компоненты и зоны ответственности:\n")
		b.WriteString(components)
	}
	if apis := strings.TrimSpace(req.APIs); apis != "" {
		b.WriteString("\n\nЗаявленные API, очереди, обработчики и контракты:\n")
		b.WriteString(apis)
	}
	if db := strings.TrimSpace(req.DatabaseSchema); db != "" {
		b.WriteString("\n\nЗаявленные базы данных, таблицы, индексы и хранение:\n")
		b.WriteString(db)
	}
	if traffic := strings.TrimSpace(req.Traffic); traffic != "" {
		b.WriteString("\n\nНагрузочные и traffic-предположения:\n")
		b.WriteString(traffic)
	}
	if reliability := strings.TrimSpace(req.Reliability); reliability != "" {
		b.WriteString("\n\nНадёжность, масштабирование и обработка сбоев:\n")
		b.WriteString(reliability)
	}
	if lowSignal := lowSignalSections(req); len(lowSignal) > 0 {
		b.WriteString("\n\nПоля, которые выглядят как заглушки или бессодержательный ввод и должны считаться отсутствующими, если схема явно не компенсирует их:\n")
		b.WriteString(strings.Join(lowSignal, ", "))
		b.WriteString(".\n")
	}
	b.WriteString("\n\nРубрика оценки:\n")
	b.WriteString("1. Насколько решение покрывает требования и реально решает задачу.\n")
	b.WriteString("2. Корректность основных компонентов и потоков данных.\n")
	b.WriteString("3. Выбор хранилищ: таблицы, индексы, консистентность, кеш, retention, очистка.\n")
	b.WriteString("4. Масштабирование: очереди, bottleneck, fan-out, backpressure, hot keys, горизонтальный рост.\n")
	b.WriteString("5. Надёжность: timeout, retry, idempotency, replication, failover, disaster recovery.\n")
	b.WriteString("6. Безопасность: auth, authz, секреты, PII, сетевые границы, изоляция.\n")
	b.WriteString("7. Наблюдаемость и эксплуатация: метрики, логи, tracing, alerts, rollout.\n")
	b.WriteString("8. Явные trade-off и недостающие предположения.\n")
	b.WriteString("Если схема есть, используй её как основной источник архитектурных доказательств, а текст кандидата как вспомогательный контекст.\n")
	b.WriteString("Если схема или текст слишком общие, прямо говори, что решение поверхностное и не подтверждает инженерную проработку.\n")
	b.WriteString("Disclaimer должен явно говорить, что это предварительная AI-оценка, а не финальный вердикт интервьюера.")
	return b.String()
}

func buildInterviewSolutionPrompt(req InterviewSolutionReviewRequest) string {
	var b strings.Builder
	b.WriteString("Ты проводишь строгое AI-ревью промежуточного решения кандидата на mock interview.\n")
	b.WriteString("Верни только валидный JSON с полями: score, summary, strengths, issues, followUpQuestions, isRelevant, isPassing.\n")
	b.WriteString("Все поля должны быть только на русском языке. Score — целое число от 1 до 10.\n")
	b.WriteString("Не хвали кандидата за объём текста или наличие кода. Оценивай только инженерическую состоятельность решения.\n")
	b.WriteString("Если решение поверхностное, нерелевантное или не доведено до рабочего состояния, прямо скажи это.\n")
	b.WriteString("Если кандидат отправил бессвязный текст, случайный код, заглушку, комментарии без решения или ответ не по задаче, обязательно выставь isRelevant=false, isPassing=false и score не выше 2.\n")
	b.WriteString("Если это кодовая задача, особенно важны корректность, структура, граничные случаи, сложность, конкурентная безопасность и trade-off.\n")
	b.WriteString("Если это архитектурная задача, особенно важны компоненты, потоки данных, надёжность, state management, failure modes и масштабирование.\n\n")
	b.WriteString("Тип этапа: ")
	b.WriteString(strings.TrimSpace(req.StageKind))
	b.WriteString("\n\nНазвание задачи:\n")
	b.WriteString(strings.TrimSpace(req.TaskTitle))
	b.WriteString("\n\nУсловие:\n")
	b.WriteString(strings.TrimSpace(req.Statement))
	if value := strings.TrimSpace(req.ReferenceSolution); value != "" {
		b.WriteString("\n\nОжидаемое направление решения / reference notes:\n")
		b.WriteString(value)
	}
	if value := strings.TrimSpace(req.CandidateNotes); value != "" {
		b.WriteString("\n\nПояснения кандидата:\n")
		b.WriteString(value)
	}
	if value := strings.TrimSpace(req.CandidateCode); value != "" {
		b.WriteString("\n\nРешение кандидата")
		if lang := strings.TrimSpace(req.CandidateLanguage); lang != "" {
			b.WriteString(" (")
			b.WriteString(lang)
			b.WriteString(")")
		}
		b.WriteString(":\n")
		b.WriteString(value)
	}
	return b.String()
}

func buildInterviewAnswerPrompt(req InterviewAnswerReviewRequest) string {
	var b strings.Builder
	b.WriteString("Ты оцениваешь устный ответ кандидата на follow-up вопрос mock interview.\n")
	b.WriteString("Верни только валидный JSON с полями: score, summary, gaps, isRelevant, isPassing.\n")
	b.WriteString("Все поля должны быть только на русском языке. Score — целое число от 1 до 10.\n")
	b.WriteString("Оцени только полноту, точность и глубину ответа. Не додумывай правильные аргументы за кандидата.\n")
	b.WriteString("Если ответ частичный, расплывчатый или уходит в сторону, прямо скажи это.\n\n")
	b.WriteString("Если ответ нерелевантен вопросу, состоит из общих слов, случайного текста или не содержит содержательного ответа, обязательно выставь isRelevant=false, isPassing=false и score не выше 2.\n\n")
	if topic := strings.TrimSpace(req.Topic); topic != "" {
		b.WriteString("Тема:\n")
		b.WriteString(topic)
		b.WriteString("\n\n")
	}
	if taskTitle := strings.TrimSpace(req.TaskTitle); taskTitle != "" {
		b.WriteString("Контекст задачи:\n")
		b.WriteString(taskTitle)
		b.WriteString("\n\n")
	}
	b.WriteString("Вопрос:\n")
	b.WriteString(strings.TrimSpace(req.QuestionPrompt))
	b.WriteString("\n\nЭталонный ответ / что важно услышать:\n")
	b.WriteString(strings.TrimSpace(req.ReferenceAnswer))
	b.WriteString("\n\nОтвет кандидата:\n")
	b.WriteString(strings.TrimSpace(req.CandidateAnswer))
	return b.String()
}

// --- JSON parsers ---

func parseReviewJSON(raw string) (*SystemDesignReview, error) {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var review SystemDesignReview
	if err := json.Unmarshal([]byte(cleaned), &review); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidResponse, err)
	}
	if review.Score < 1 {
		review.Score = 1
	}
	if review.Score > 10 {
		review.Score = 10
	}
	review.IsRelevant = normalizeReviewRelevant(review.IsRelevant, review.Score, review.Summary, review.Issues, review.MissingTopics)
	review.IsPassing = normalizeReviewPassing(review.IsPassing, review.IsRelevant, review.Score, review.Summary, review.Issues, review.MissingTopics)
	if review.Disclaimer == "" {
		review.Disclaimer = "Предварительная AI-оценка, а не финальный вердикт интервьюера."
	}
	return &review, nil
}

func parseInterviewSolutionJSON(raw string) (*InterviewSolutionReview, error) {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var review InterviewSolutionReview
	if err := json.Unmarshal([]byte(cleaned), &review); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidResponse, err)
	}
	if review.Score < 1 {
		review.Score = 1
	}
	if review.Score > 10 {
		review.Score = 10
	}
	review.IsRelevant = normalizeReviewRelevant(review.IsRelevant, review.Score, review.Summary, review.Issues, review.Strengths)
	review.IsPassing = normalizeReviewPassing(review.IsPassing, review.IsRelevant, review.Score, review.Summary, review.Issues, review.Strengths)
	return &review, nil
}

func parseInterviewAnswerJSON(raw string) (*InterviewAnswerReview, error) {
	cleaned := strings.TrimSpace(raw)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var payload map[string]any
	if err := json.Unmarshal([]byte(cleaned), &payload); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidResponse, err)
	}
	review := InterviewAnswerReview{
		Provider:   toStringValue(payload["provider"]),
		Model:      toStringValue(payload["model"]),
		Score:      toIntValue(payload["score"]),
		Summary:    strings.TrimSpace(toStringValue(payload["summary"])),
		Gaps:       normalizeStringList(payload["gaps"]),
		IsRelevant: toBoolValue(payload["isRelevant"]),
		IsPassing:  toBoolValue(payload["isPassing"]),
	}
	if review.Score < 1 {
		review.Score = 1
	}
	if review.Score > 10 {
		review.Score = 10
	}
	review.IsRelevant = normalizeReviewRelevant(review.IsRelevant, review.Score, review.Summary, review.Gaps)
	review.IsPassing = normalizeReviewPassing(review.IsPassing, review.IsRelevant, review.Score, review.Summary, review.Gaps)
	return &review, nil
}

// --- Helpers ---

func toStringValue(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case json.Number:
		return typed.String()
	case float64:
		return fmt.Sprintf("%.0f", typed)
	default:
		return ""
	}
}

func toIntValue(value any) int {
	switch typed := value.(type) {
	case float64:
		return int(typed)
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case json.Number:
		if parsed, err := typed.Int64(); err == nil {
			return int(parsed)
		}
	}
	return 0
}

func toBoolValue(value any) bool {
	switch typed := value.(type) {
	case bool:
		return typed
	case string:
		switch strings.ToLower(strings.TrimSpace(typed)) {
		case "true", "1", "yes":
			return true
		default:
			return false
		}
	default:
		return false
	}
}

func normalizeStringList(value any) []string {
	switch typed := value.(type) {
	case []any:
		items := make([]string, 0, len(typed))
		for _, item := range typed {
			if text := strings.TrimSpace(toStringValue(item)); text != "" {
				items = append(items, text)
			}
		}
		return items
	case []string:
		items := make([]string, 0, len(typed))
		for _, item := range typed {
			if text := strings.TrimSpace(item); text != "" {
				items = append(items, text)
			}
		}
		return items
	case string:
		text := strings.TrimSpace(typed)
		if text == "" {
			return nil
		}
		return []string{text}
	default:
		return nil
	}
}

func normalizeReviewRelevant(explicit bool, score int, values ...any) bool {
	text := strings.ToLower(strings.Join(flattenReviewTexts(values...), "\n"))
	if containsReviewMarker(text, []string{
		"нерелев", "не по задаче", "не относится к задаче", "не отвечает на вопрос", "не отвечает на задачу",
		"off-topic", "off topic", "набор слов", "бессмысл", "бессодерж", "случайный текст", "gibber", "рандом",
	}) {
		return false
	}
	if explicit {
		return true
	}
	return score >= 3
}

func normalizeReviewPassing(explicit bool, relevant bool, score int, values ...any) bool {
	if !relevant {
		return false
	}
	text := strings.ToLower(strings.Join(flattenReviewTexts(values...), "\n"))
	if containsReviewMarker(text, []string{
		"нерелев", "не по задаче", "не отвечает на вопрос", "не отвечает на задачу", "набор слов", "бессмысл", "gibber",
	}) {
		return false
	}
	if explicit {
		return true
	}
	return score >= 6
}

func flattenReviewTexts(values ...any) []string {
	items := make([]string, 0, len(values)*2)
	for _, value := range values {
		switch typed := value.(type) {
		case string:
			if trimmed := strings.TrimSpace(typed); trimmed != "" {
				items = append(items, trimmed)
			}
		case []string:
			for _, item := range typed {
				if trimmed := strings.TrimSpace(item); trimmed != "" {
					items = append(items, trimmed)
				}
			}
		}
	}
	return items
}

func containsReviewMarker(text string, markers []string) bool {
	for _, marker := range markers {
		if strings.Contains(text, marker) {
			return true
		}
	}
	return false
}

func timeoutOrDefault(v time.Duration) time.Duration {
	if v <= 0 {
		return 30 * time.Second
	}
	return v
}

func firstNonEmptyTrimmed(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func truncate(value string, limit int) string {
	if len(value) <= limit {
		return value
	}
	return value[:limit] + "..."
}

func lowSignalSections(req SystemDesignReviewRequest) []string {
	sections := []struct {
		label string
		value string
	}{
		{label: "notes", value: req.Notes},
		{label: "components", value: req.Components},
		{label: "apis", value: req.APIs},
		{label: "databaseSchema", value: req.DatabaseSchema},
		{label: "traffic", value: req.Traffic},
		{label: "reliability", value: req.Reliability},
	}

	var result []string
	for _, section := range sections {
		if isLowSignalText(section.value) {
			result = append(result, section.label)
		}
	}
	return result
}

func isLowSignalText(value string) bool {
	trimmed := strings.TrimSpace(strings.ToLower(value))
	if trimmed == "" {
		return false
	}

	fields := strings.FieldsFunc(trimmed, func(r rune) bool {
		return unicode.IsSpace(r) || unicode.IsPunct(r) || unicode.IsSymbol(r)
	})
	if len(fields) == 0 {
		return true
	}

	allNumeric := true
	allSame := true
	first := fields[0]
	shortTokenCount := 0
	for _, field := range fields {
		if !isDigitsOnly(field) {
			allNumeric = false
		}
		if field != first {
			allSame = false
		}
		if len(field) <= 3 {
			shortTokenCount++
		}
	}

	if allNumeric || allSame {
		return true
	}
	if len(fields) <= 3 && shortTokenCount == len(fields) {
		return true
	}

	alphaCount := 0
	for _, r := range trimmed {
		if unicode.IsLetter(r) {
			alphaCount++
		}
	}
	return alphaCount < 4
}

func isDigitsOnly(value string) bool {
	if value == "" {
		return false
	}
	for _, r := range value {
		if !unicode.IsDigit(r) {
			return false
		}
	}
	return true
}

func mapProviderError(statusCode int, body []byte) error {
	message := truncate(string(body), 300)
	lowerMessage := strings.ToLower(message)

	if strings.Contains(lowerMessage, "no endpoints found that support image input") ||
		strings.Contains(lowerMessage, "does not support image input") ||
		(strings.Contains(lowerMessage, "vision") && strings.Contains(lowerMessage, "not support")) {
		return fmt.Errorf("%w: current model/provider cannot analyze screenshots, choose a vision-capable model", ErrVisionUnsupported)
	}

	return fmt.Errorf("ai review provider returned %d: %s", statusCode, message)
}
