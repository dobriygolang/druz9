package aireview

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
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
}

type Reviewer interface {
	ReviewSystemDesign(ctx context.Context, req SystemDesignReviewRequest) (*SystemDesignReview, error)
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

type unsupportedReviewer struct {
	provider string
}

func (u unsupportedReviewer) ReviewSystemDesign(context.Context, SystemDesignReviewRequest) (*SystemDesignReview, error) {
	return nil, fmt.Errorf("%w: %s", ErrUnsupportedProvider, u.provider)
}

type geminiReviewer struct {
	baseURL string
	apiKey  string
	model   string
	client  *http.Client
}

func (g *geminiReviewer) ReviewSystemDesign(ctx context.Context, req SystemDesignReviewRequest) (*SystemDesignReview, error) {
	if g.apiKey == "" || g.model == "" {
		return nil, ErrNotConfigured
	}

	baseURL := g.baseURL
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com"
	}

	prompt := buildSystemDesignPrompt(req)
	payload := map[string]any{
		"contents": []map[string]any{
			{
				"parts": []map[string]any{
					{
						"inline_data": map[string]any{
							"mime_type": req.ImageMIME,
							"data":      base64.StdEncoding.EncodeToString(req.ImageBytes),
						},
					},
					{
						"text": prompt,
					},
				},
			},
		},
		"generationConfig": map[string]any{
			"temperature":      0.2,
			"responseMimeType": "application/json",
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/v1beta/models/%s:generateContent?key=%s", baseURL, g.model, g.apiKey)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, mapProviderError(resp.StatusCode, respBody)
	}

	var parsed struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}
	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return nil, ErrInvalidResponse
	}

	review, err := parseReviewJSON(parsed.Candidates[0].Content.Parts[0].Text)
	if err != nil {
		return nil, err
	}
	review.Provider = "gemini"
	review.Model = g.model
	return review, nil
}

type openAICompatibleReviewer struct {
	baseURL string
	apiKey  string
	model   string
	client  *http.Client
}

func (o *openAICompatibleReviewer) ReviewSystemDesign(ctx context.Context, req SystemDesignReviewRequest) (*SystemDesignReview, error) {
	if o.apiKey == "" || o.model == "" {
		return nil, ErrNotConfigured
	}

	baseURL := o.baseURL
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}

	imageDataURL := "data:" + req.ImageMIME + ";base64," + base64.StdEncoding.EncodeToString(req.ImageBytes)
	payload := map[string]any{
		"model": o.model,
		"messages": []map[string]any{
			{
				"role": "user",
				"content": []map[string]any{
					{
						"type": "text",
						"text": buildSystemDesignPrompt(req),
					},
					{
						"type": "image_url",
						"image_url": map[string]any{
							"url": imageDataURL,
						},
					},
				},
			},
		},
		"temperature": 0.2,
		"response_format": map[string]any{
			"type": "json_object",
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+o.apiKey)

	resp, err := o.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 400 {
		return nil, mapProviderError(resp.StatusCode, respBody)
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}
	if len(parsed.Choices) == 0 || strings.TrimSpace(parsed.Choices[0].Message.Content) == "" {
		return nil, ErrInvalidResponse
	}

	review, err := parseReviewJSON(parsed.Choices[0].Message.Content)
	if err != nil {
		return nil, err
	}
	review.Provider = "openai_compatible"
	review.Model = o.model
	return review, nil
}

func buildSystemDesignPrompt(req SystemDesignReviewRequest) string {
	var b strings.Builder
	b.WriteString("Ты проводишь строгий предварительный review ответа кандидата по system design.\n")
	b.WriteString("На входе есть изображение схемы и структурированные поля с пояснениями кандидата.\n")
	b.WriteString("Верни только валидный JSON с полями: score, summary, strengths, issues, missingTopics, followUpQuestions, disclaimer.\n")
	b.WriteString("Все строки и элементы массивов должны быть только на русском языке.\n")
	b.WriteString("Score должен быть целым числом от 1 до 10.\n")
	b.WriteString("Оценивай архитектурное качество, а не красоту картинки.\n")
	b.WriteString("Не додумывай детали за кандидата. Если тезис не подтверждается схемой или текстом, считай его отсутствующим.\n")
	b.WriteString("Если текстовые поля пустые, шаблонные, бессодержательные или не объясняют решение, считай их отсутствующими.\n")
	b.WriteString("Не хвали кандидата за сам факт заполнения полей. В strengths должны попадать только подтверждённые инженерные решения.\n")
	b.WriteString("Если схема нерелевантна задаче или не похожа на архитектурную диаграмму, не выдумывай систему и ставь низкую оценку.\n")
	b.WriteString("Если вход слабый или нерелевантный, прямо скажи это в summary и issues.\n\n")
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
	b.WriteString("Используй схему как основной источник архитектурных доказательств, а текст кандидата как вспомогательный контекст.\n")
	b.WriteString("Если схема или текст слишком общие, прямо говори, что решение поверхностное и не подтверждает инженерную проработку.\n")
	b.WriteString("Disclaimer должен явно говорить, что это предварительная AI-оценка, а не финальный вердикт интервьюера.")
	return b.String()
}

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
	if review.Disclaimer == "" {
		review.Disclaimer = "Предварительная AI-оценка, а не финальный вердикт интервьюера."
	}
	return &review, nil
}

func timeoutOrDefault(v time.Duration) time.Duration {
	if v <= 0 {
		return 30 * time.Second
	}
	return v
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
