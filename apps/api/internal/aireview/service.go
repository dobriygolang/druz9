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
)

var (
	ErrNotConfigured       = errors.New("ai review provider is not configured")
	ErrUnsupportedProvider = errors.New("unsupported ai review provider")
	ErrInvalidResponse     = errors.New("invalid ai review response")
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
		return nil, fmt.Errorf("ai review provider returned %d: %s", resp.StatusCode, truncate(string(respBody), 300))
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
		return nil, fmt.Errorf("ai review provider returned %d: %s", resp.StatusCode, truncate(string(respBody), 300))
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
	b.WriteString("You are reviewing a system design interview solution.\n")
	b.WriteString("You receive an architecture diagram image plus structured candidate notes.\n")
	b.WriteString("Return only valid JSON with fields: score, summary, strengths, issues, missingTopics, followUpQuestions, disclaimer.\n")
	b.WriteString("Score must be an integer from 1 to 10.\n")
	b.WriteString("Be strict, concrete, and evaluate architecture quality rather than drawing aesthetics.\n")
	b.WriteString("If a claim is not supported by the diagram or notes, call that out explicitly.\n")
	b.WriteString("If some information is missing, mention it in issues or missingTopics instead of inventing details.\n\n")
	b.WriteString("Task title:\n")
	b.WriteString(strings.TrimSpace(req.TaskTitle))
	b.WriteString("\n\nTask statement:\n")
	b.WriteString(strings.TrimSpace(req.Statement))
	if notes := strings.TrimSpace(req.Notes); notes != "" {
		b.WriteString("\n\nCandidate notes:\n")
		b.WriteString(notes)
	}
	if components := strings.TrimSpace(req.Components); components != "" {
		b.WriteString("\n\nDeclared components and responsibilities:\n")
		b.WriteString(components)
	}
	if apis := strings.TrimSpace(req.APIs); apis != "" {
		b.WriteString("\n\nDeclared APIs, handlers, queues or contracts:\n")
		b.WriteString(apis)
	}
	if db := strings.TrimSpace(req.DatabaseSchema); db != "" {
		b.WriteString("\n\nDeclared databases, tables, indexes and storage notes:\n")
		b.WriteString(db)
	}
	if traffic := strings.TrimSpace(req.Traffic); traffic != "" {
		b.WriteString("\n\nTraffic and load assumptions:\n")
		b.WriteString(traffic)
	}
	if reliability := strings.TrimSpace(req.Reliability); reliability != "" {
		b.WriteString("\n\nReliability, scaling and failure-handling notes:\n")
		b.WriteString(reliability)
	}
	b.WriteString("\n\nReview rubric:\n")
	b.WriteString("1. Requirements coverage and whether the design actually solves the asked problem.\n")
	b.WriteString("2. Correctness of major components and data flow.\n")
	b.WriteString("3. Storage choices: tables, indexes, partitioning, caching, consistency, retention.\n")
	b.WriteString("4. Scalability: bottlenecks, fan-out, backpressure, hot keys, queues, horizontal scaling.\n")
	b.WriteString("5. Reliability: timeouts, retries, idempotency, replication, failover, disaster recovery.\n")
	b.WriteString("6. Security: auth, authz, secrets, PII, network boundaries.\n")
	b.WriteString("7. Observability and operations: metrics, logs, tracing, alerts, rollouts.\n")
	b.WriteString("8. Trade-offs and missing assumptions.\n")
	b.WriteString("Use the image as primary architectural evidence and the candidate notes as supporting context. ")
	b.WriteString("Disclaimer should clearly say this is a preliminary AI review, not a final interviewer verdict.")
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
