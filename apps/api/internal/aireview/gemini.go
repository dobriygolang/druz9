package aireview

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type geminiReviewer struct {
	baseURL string
	apiKey  string
	model   string
	client  *http.Client
}

func (g *geminiReviewer) call(ctx context.Context, model string, parts []map[string]any, temperature float64) (string, error) {
	if g.apiKey == "" || model == "" {
		return "", ErrNotConfigured
	}

	baseURL := g.baseURL
	if baseURL == "" {
		baseURL = "https://generativelanguage.googleapis.com"
	}

	payload := map[string]any{
		"contents": []map[string]any{
			{"parts": parts},
		},
		"generationConfig": map[string]any{
			"temperature":      temperature,
			"responseMimeType": "application/json",
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	url := fmt.Sprintf("%s/v1beta/models/%s:generateContent?key=%s", baseURL, model, g.apiKey)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode >= 400 {
		return "", mapProviderError(resp.StatusCode, respBody)
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
		return "", err
	}
	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return "", ErrInvalidResponse
	}
	return parsed.Candidates[0].Content.Parts[0].Text, nil
}

func (g *geminiReviewer) ReviewSystemDesign(ctx context.Context, req SystemDesignReviewRequest) (*SystemDesignReview, error) {
	parts := []map[string]any{
		{"text": buildSystemDesignPrompt(req)},
	}
	if len(req.ImageBytes) > 0 {
		parts = append([]map[string]any{
			{
				"inline_data": map[string]any{
					"mime_type": req.ImageMIME,
					"data":      base64.StdEncoding.EncodeToString(req.ImageBytes),
				},
			},
		}, parts...)
	}

	raw, err := g.call(ctx, g.model, parts, 0.2)
	if err != nil {
		return nil, err
	}

	review, err := parseReviewJSON(raw)
	if err != nil {
		return nil, err
	}
	review.Provider = "gemini"
	review.Model = g.model
	return review, nil
}

func (g *geminiReviewer) ReviewInterviewSolution(ctx context.Context, req InterviewSolutionReviewRequest) (*InterviewSolutionReview, error) {
	modelName := firstNonEmptyTrimmed(req.ModelOverride, g.model)
	parts := []map[string]any{
		{"text": buildInterviewSolutionPrompt(req)},
	}

	raw, err := g.call(ctx, modelName, parts, 0.2)
	if err != nil {
		return nil, err
	}

	review, err := parseInterviewSolutionJSON(raw)
	if err != nil {
		return nil, err
	}
	review.Provider = "gemini"
	review.Model = modelName
	return review, nil
}

func (g *geminiReviewer) ReviewInterviewAnswer(ctx context.Context, req InterviewAnswerReviewRequest) (*InterviewAnswerReview, error) {
	modelName := firstNonEmptyTrimmed(req.ModelOverride, g.model)
	parts := []map[string]any{
		{"text": buildInterviewAnswerPrompt(req)},
	}

	raw, err := g.call(ctx, modelName, parts, 0.1)
	if err != nil {
		return nil, err
	}

	review, err := parseInterviewAnswerJSON(raw)
	if err != nil {
		return nil, err
	}
	review.Provider = "gemini"
	review.Model = modelName
	return review, nil
}
