package interviewprephttp

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"api/internal/model"

	"github.com/google/uuid"
)

func normalizeTaskRequest(req adminTaskRequest) adminTaskRequest {
	req.Title = strings.TrimSpace(req.Title)
	req.Statement = strings.TrimSpace(req.Statement)
	req.PrepType = strings.TrimSpace(req.PrepType)
	req.Language = strings.TrimSpace(req.Language)
	req.ExecutionProfile = strings.TrimSpace(req.ExecutionProfile)
	req.RunnerMode = strings.TrimSpace(req.RunnerMode)
	req.StarterCode = strings.TrimSpace(req.StarterCode)
	req.ReferenceSolution = strings.TrimSpace(req.ReferenceSolution)
	req.CodeTaskID = strings.TrimSpace(req.CodeTaskID)
	req.Slug = normalizeSlug(req.Slug, req.Title)
	if req.PrepType == "" {
		req.PrepType = model.InterviewPrepTypeAlgorithm.String()
	}
	if req.Language == "" {
		req.Language = "go"
	}
	if req.ExecutionProfile == "" {
		req.ExecutionProfile = "pure"
	}
	if req.RunnerMode == "" {
		req.RunnerMode = "function_io"
	}
	if req.DurationSeconds <= 0 {
		req.DurationSeconds = 1800
	}
	return req
}

func validateTaskRequest(req adminTaskRequest) string {
	if req.Title == "" {
		return "title is required"
	}
	if req.Slug == "" {
		return "slug is required"
	}
	if req.Statement == "" {
		return "statement is required"
	}
	if model.InterviewPrepTypeFromString(req.PrepType) == model.InterviewPrepTypeUnknown {
		return "invalid prep type"
	}
	switch req.Language {
	case "go", "python", "sql":
	default:
		return "unsupported language"
	}
	if req.IsExecutable && req.CodeTaskID == "" {
		return "codeTaskId is required for executable tasks"
	}
	if req.CodeTaskID != "" {
		if _, err := uuid.Parse(req.CodeTaskID); err != nil {
			return "invalid codeTaskId"
		}
	}
	return ""
}

func decodeQuestionRequest(r *http.Request) (*adminQuestionRequest, error) {
	var req adminQuestionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, errors.New("bad request")
	}

	req.Prompt = strings.TrimSpace(req.Prompt)
	req.Answer = strings.TrimSpace(req.Answer)
	if req.Position < 1 {
		return nil, errors.New("position must be >= 1")
	}
	if req.Prompt == "" || req.Answer == "" {
		return nil, errors.New("prompt and answer are required")
	}
	return &req, nil
}

func parseOptionalUUID(value string) *uuid.UUID {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parsed, err := uuid.Parse(strings.TrimSpace(value))
	if err != nil {
		return nil
	}
	return &parsed
}

func normalizeSlug(rawSlug string, title string) string {
	value := strings.TrimSpace(strings.ToLower(rawSlug))
	if value == "" {
		value = strings.TrimSpace(strings.ToLower(title))
	}
	value = SlugPattern.ReplaceAllString(value, "-")
	return strings.Trim(value, "-")
}
