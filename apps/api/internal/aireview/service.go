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
	TaskTitle  string
	Statement  string
	Notes      string
	ImageBytes []byte
	ImageMIME  string
	ImageName  string
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
	b.WriteString("You are reviewing a system design interview diagram from a candidate. ")
	b.WriteString("Return only valid JSON with fields: score, summary, strengths, issues, missingTopics, followUpQuestions, disclaimer. ")
	b.WriteString("Score must be an integer from 1 to 10. ")
	b.WriteString("Be strict, concise, and focus on architecture quality rather than drawing aesthetics. ")
	b.WriteString("Assume the uploaded image is the architecture diagram.\n\n")
	b.WriteString("Task title: ")
	b.WriteString(strings.TrimSpace(req.TaskTitle))
	b.WriteString("\nTask statement:\n")
	b.WriteString(strings.TrimSpace(req.Statement))
	if notes := strings.TrimSpace(req.Notes); notes != "" {
		b.WriteString("\nCandidate notes:\n")
		b.WriteString(notes)
	}
	b.WriteString("\n\nRubric: requirements coverage, components, data flow, scaling, reliability, storage choices, caching, async processing, security, observability, and trade-offs. ")
	b.WriteString("If some parts are not visible, say so explicitly in summary or issues. ")
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
