package aireview

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

type openAICompatibleReviewer struct {
	baseURL string
	apiKey  string
	model   string
	client  *http.Client
}

func (o *openAICompatibleReviewer) call(ctx context.Context, model string, content []map[string]any, temperature float64) (string, error) {
	if o.apiKey == "" || model == "" {
		return "", ErrNotConfigured
	}

	baseURL := o.baseURL
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}

	payload := map[string]any{
		"model": model,
		"messages": []map[string]any{
			{
				"role":    "user",
				"content": content,
			},
		},
		"temperature": temperature,
		"response_format": map[string]any{
			"type": "json_object",
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+o.apiKey)

	resp, err := o.client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode >= 400 {
		return "", mapProviderError(resp.StatusCode, respBody)
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("unmarshal response: %w", err)
	}
	if len(parsed.Choices) == 0 || strings.TrimSpace(parsed.Choices[0].Message.Content) == "" {
		return "", ErrInvalidResponse
	}
	return parsed.Choices[0].Message.Content, nil
}

func (o *openAICompatibleReviewer) ReviewSystemDesign(ctx context.Context, req SystemDesignReviewRequest) (*SystemDesignReview, error) {
	modelName := firstNonEmptyTrimmed(req.ModelOverride, o.model)
	content := []map[string]any{
		{
			"type": "text",
			"text": buildSystemDesignPrompt(req),
		},
	}
	if len(req.ImageBytes) > 0 {
		imageDataURL := "data:" + req.ImageMIME + ";base64," + base64.StdEncoding.EncodeToString(req.ImageBytes)
		content = append(content, map[string]any{
			"type": "image_url",
			"image_url": map[string]any{
				"url": imageDataURL,
			},
		})
	}

	raw, err := o.call(ctx, modelName, content, 0.2)
	if err != nil {
		return nil, err
	}

	review, err := parseReviewJSON(raw)
	if err != nil {
		return nil, err
	}
	review.Provider = "openai_compatible"
	review.Model = modelName
	return review, nil
}

func (o *openAICompatibleReviewer) ReviewInterviewSolution(ctx context.Context, req InterviewSolutionReviewRequest) (*InterviewSolutionReview, error) {
	modelName := firstNonEmptyTrimmed(req.ModelOverride, o.model)
	content := []map[string]any{
		{
			"type": "text",
			"text": buildInterviewSolutionPrompt(req),
		},
	}

	raw, err := o.call(ctx, modelName, content, 0.2)
	if err != nil {
		return nil, err
	}

	review, err := parseInterviewSolutionJSON(raw)
	if err != nil {
		return nil, err
	}
	review.Provider = "openai_compatible"
	review.Model = modelName
	return review, nil
}

func (o *openAICompatibleReviewer) Chat(ctx context.Context, req LiveChatRequest) (string, error) {
	modelName := firstNonEmptyTrimmed(req.ModelOverride, o.model)
	if o.apiKey == "" || modelName == "" {
		return "", ErrNotConfigured
	}

	baseURL := o.baseURL
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}

	apiMessages := make([]map[string]any, 0, len(req.Messages))
	for _, m := range req.Messages {
		apiMessages = append(apiMessages, map[string]any{
			"role":    m.Role,
			"content": m.Content,
		})
	}

	payload := map[string]any{
		"model":       modelName,
		"messages":    apiMessages,
		"temperature": 0.7,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+o.apiKey)

	resp, err := o.client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode >= 400 {
		return "", mapProviderError(resp.StatusCode, respBody)
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", fmt.Errorf("unmarshal response: %w", err)
	}
	if len(parsed.Choices) == 0 || strings.TrimSpace(parsed.Choices[0].Message.Content) == "" {
		return "", ErrInvalidResponse
	}
	return strings.TrimSpace(parsed.Choices[0].Message.Content), nil
}

func (o *openAICompatibleReviewer) ReviewInterviewAnswer(ctx context.Context, req InterviewAnswerReviewRequest) (*InterviewAnswerReview, error) {
	modelName := firstNonEmptyTrimmed(req.ModelOverride, o.model)
	content := []map[string]any{
		{
			"type": "text",
			"text": buildInterviewAnswerPrompt(req),
		},
	}

	raw, err := o.call(ctx, modelName, content, 0.1)
	if err != nil {
		return nil, err
	}

	review, err := parseInterviewAnswerJSON(raw)
	if err != nil {
		return nil, err
	}
	review.Provider = "openai_compatible"
	review.Model = modelName
	return review, nil
}
