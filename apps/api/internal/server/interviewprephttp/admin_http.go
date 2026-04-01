package interviewprephttp

import (
	"encoding/json"
	"net/http"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

type adminTaskRequest struct {
	Slug              string `json:"slug"`
	Title             string `json:"title"`
	Statement         string `json:"statement"`
	PrepType          string `json:"prepType"`
	Language          string `json:"language"`
	IsExecutable      bool   `json:"isExecutable"`
	ExecutionProfile  string `json:"executionProfile"`
	RunnerMode        string `json:"runnerMode"`
	DurationSeconds   int32  `json:"durationSeconds"`
	StarterCode       string `json:"starterCode"`
	ReferenceSolution string `json:"referenceSolution"`
	CodeTaskID        string `json:"codeTaskId"`
	IsActive          bool   `json:"isActive"`
}

type adminQuestionRequest struct {
	Position int32  `json:"position"`
	Prompt   string `json:"prompt"`
	Answer   string `json:"answer"`
}

func handleAdminPath(w http.ResponseWriter, r *http.Request, repo AdminRepo, parts []string) {
	if len(parts) == 0 || parts[0] != "tasks" {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	if len(parts) == 1 {
		handleTasksCollection(w, r, repo)
		return
	}

	taskID, err := uuid.Parse(parts[1])
	if err != nil {
		writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid task id"})
		return
	}

	if len(parts) == 2 {
		handleTaskByID(w, r, taskID, repo)
		return
	}

	if parts[2] != "questions" {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	if len(parts) == 3 {
		handleQuestions(w, r, taskID, repo)
		return
	}

	if len(parts) == 4 {
		questionID, err := uuid.Parse(parts[3])
		if err != nil {
			writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid question id"})
			return
		}
		handleQuestionByID(w, r, taskID, questionID, repo)
		return
	}

	http.Error(w, "not found", http.StatusNotFound)
}

func handleTasksCollection(w http.ResponseWriter, r *http.Request, repo AdminRepo) {
	switch r.Method {
	case http.MethodGet:
		tasks, err := repo.ListAllTasks(r.Context())
		if err != nil {
			writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		writeAdminJSON(w, http.StatusOK, map[string]any{"tasks": tasks})
	case http.MethodPost:
		handleCreateTask(w, r, repo)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleCreateTask(w http.ResponseWriter, r *http.Request, repo AdminRepo) {
	var req adminTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": "bad request"})
		return
	}

	req = normalizeTaskRequest(req)
	if validationErr := validateTaskRequest(req); validationErr != "" {
		writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": validationErr})
		return
	}

	now := time.Now().UTC()
	task := buildTask(req, uuid.New())
	task.CreatedAt = now
	task.UpdatedAt = now

	if err := repo.CreateTask(r.Context(), task); err != nil {
		writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}

	writeAdminJSON(w, http.StatusOK, map[string]any{"task": task})
}

func handleTaskByID(w http.ResponseWriter, r *http.Request, taskID uuid.UUID, repo AdminRepo) {
	switch r.Method {
	case http.MethodGet:
		task, err := repo.GetTask(r.Context(), taskID)
		if err != nil {
			writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		if task == nil {
			writeAdminJSON(w, http.StatusNotFound, map[string]any{"error": "task not found"})
			return
		}
		writeAdminJSON(w, http.StatusOK, map[string]any{"task": task})
	case http.MethodPut:
		var req adminTaskRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": "bad request"})
			return
		}
		req = normalizeTaskRequest(req)
		if validationErr := validateTaskRequest(req); validationErr != "" {
			writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": validationErr})
			return
		}
		task := buildTask(req, taskID)
		if err := repo.UpdateTask(r.Context(), task); err != nil {
			writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		writeAdminJSON(w, http.StatusOK, map[string]any{"task": task})
	case http.MethodDelete:
		if err := repo.DeleteTask(r.Context(), taskID); err != nil {
			writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		writeAdminJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleQuestions(w http.ResponseWriter, r *http.Request, taskID uuid.UUID, repo AdminRepo) {
	switch r.Method {
	case http.MethodGet:
		questions, err := repo.ListQuestionsByTask(r.Context(), taskID)
		if err != nil {
			writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		writeAdminJSON(w, http.StatusOK, map[string]any{"questions": questions})
	case http.MethodPost:
		req, err := decodeQuestionRequest(r)
		if err != nil {
			writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
			return
		}
		now := time.Now().UTC()
		question := &model.InterviewPrepQuestion{
			ID:        uuid.New(),
			TaskID:    taskID,
			Position:  req.Position,
			Prompt:    req.Prompt,
			Answer:    req.Answer,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := repo.CreateQuestion(r.Context(), question); err != nil {
			writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		writeAdminJSON(w, http.StatusOK, map[string]any{"question": question})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleQuestionByID(w http.ResponseWriter, r *http.Request, taskID, questionID uuid.UUID, repo AdminRepo) {
	switch r.Method {
	case http.MethodPut:
		req, err := decodeQuestionRequest(r)
		if err != nil {
			writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
			return
		}
		question := &model.InterviewPrepQuestion{
			ID:       questionID,
			TaskID:   taskID,
			Position: req.Position,
			Prompt:   req.Prompt,
			Answer:   req.Answer,
		}
		if err := repo.UpdateQuestion(r.Context(), question); err != nil {
			writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		writeAdminJSON(w, http.StatusOK, map[string]any{"question": question})
	case http.MethodDelete:
		if err := repo.DeleteQuestion(r.Context(), questionID); err != nil {
			writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		writeAdminJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func buildTask(req adminTaskRequest, taskID uuid.UUID) *model.InterviewPrepTask {
	return &model.InterviewPrepTask{
		ID:                taskID,
		Slug:              req.Slug,
		Title:             req.Title,
		Statement:         req.Statement,
		PrepType:          model.InterviewPrepTypeFromString(req.PrepType),
		Language:          req.Language,
		IsExecutable:      req.IsExecutable,
		ExecutionProfile:  req.ExecutionProfile,
		RunnerMode:        req.RunnerMode,
		DurationSeconds:   req.DurationSeconds,
		StarterCode:       req.StarterCode,
		ReferenceSolution: req.ReferenceSolution,
		CodeTaskID:        parseOptionalUUID(req.CodeTaskID),
		IsActive:          req.IsActive,
	}
}
