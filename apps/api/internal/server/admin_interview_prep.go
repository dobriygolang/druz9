package server

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

const adminInterviewPrepPrefix = "/api/admin/interview-prep/"

type adminInterviewPrepAuthorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
}

type adminInterviewPrepRepo interface {
	ListAllTasks(ctx context.Context) ([]*model.InterviewPrepTask, error)
	CreateTask(ctx context.Context, task *model.InterviewPrepTask) error
	UpdateTask(ctx context.Context, task *model.InterviewPrepTask) error
	DeleteTask(ctx context.Context, taskID uuid.UUID) error
	GetTask(ctx context.Context, taskID uuid.UUID) (*model.InterviewPrepTask, error)
	ListQuestionsByTask(ctx context.Context, taskID uuid.UUID) ([]*model.InterviewPrepQuestion, error)
	CreateQuestion(ctx context.Context, question *model.InterviewPrepQuestion) error
	UpdateQuestion(ctx context.Context, question *model.InterviewPrepQuestion) error
	DeleteQuestion(ctx context.Context, questionID uuid.UUID) error
}

func RegisterAdminInterviewPrepRoutes(
	srv interface{ HandlePrefix(prefix string, handler http.Handler) },
	repo adminInterviewPrepRepo,
	authorizer adminInterviewPrepAuthorizer,
) {
	srv.HandlePrefix(adminInterviewPrepPrefix, adminInterviewPrepHandler(repo, authorizer))
}

func adminInterviewPrepHandler(repo adminInterviewPrepRepo, authorizer adminInterviewPrepAuthorizer) http.Handler {
	mux := http.NewServeMux()

	// Main handler for all admin interview-prep routes
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		user, authErr := adminCheckAuth(r, authorizer)
		if authErr != nil {
			writeAdminJSON(w, authErr.status, authErr.response)
			return
		}
		if !user.IsAdmin {
			writeAdminJSON(w, http.StatusForbidden, map[string]any{"error": "admin required"})
			return
		}

		// Remove the prefix to get the relative path
		path := strings.TrimPrefix(r.URL.Path, adminInterviewPrepPrefix)
		parts := strings.Split(path, "/")

		// /tasks - list all or create
		if len(parts) >= 1 && parts[0] == "tasks" {
			if len(parts) == 1 {
				// /tasks - GET list all, POST create
				if r.Method == http.MethodGet {
					tasks, err := repo.ListAllTasks(r.Context())
					if err != nil {
						writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
						return
					}
					writeAdminJSON(w, http.StatusOK, map[string]any{"tasks": tasks})
					return
				}
				if r.Method == http.MethodPost {
					handleCreateTask(w, r, repo)
					return
				}
			} else if len(parts) >= 2 {
				// /tasks/{taskID} or /tasks/{taskID}/...
				taskID, err := uuid.Parse(parts[1])
				if err != nil {
					writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid task id"})
					return
				}

				if len(parts) == 2 {
					// /tasks/{taskID} - GET, PUT, DELETE
					handleTaskByID(w, r, taskID, repo)
					return
				}

				// /tasks/{taskID}/questions
				if parts[2] == "questions" {
					if len(parts) == 3 {
						// /tasks/{taskID}/questions - GET list, POST create
						handleQuestions(w, r, taskID, repo)
						return
					}
					if len(parts) == 4 {
						// /tasks/{taskID}/questions/{questionID} - PUT, DELETE
						questionID, err := uuid.Parse(parts[3])
						if err != nil {
							writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid question id"})
							return
						}
						handleQuestionByID(w, r, taskID, questionID, repo)
						return
					}
				}
			}
		}

		http.Error(w, "not found", http.StatusNotFound)
	})

	return mux
}

func handleCreateTask(w http.ResponseWriter, r *http.Request, repo adminInterviewPrepRepo) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
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
		IsActive          bool   `json:"isActive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": "bad request"})
		return
	}

	prepType := model.InterviewPrepTypeFromString(req.PrepType)
	if prepType == "" {
		prepType = model.InterviewPrepTypeAlgorithm
	}

	task := &model.InterviewPrepTask{
		ID:                uuid.New(),
		Slug:              req.Slug,
		Title:             req.Title,
		Statement:         req.Statement,
		PrepType:          prepType,
		Language:          req.Language,
		IsExecutable:      req.IsExecutable,
		ExecutionProfile:  req.ExecutionProfile,
		RunnerMode:        req.RunnerMode,
		DurationSeconds:   req.DurationSeconds,
		StarterCode:       req.StarterCode,
		ReferenceSolution: req.ReferenceSolution,
		IsActive:          req.IsActive,
		CreatedAt:         time.Now().UTC(),
		UpdatedAt:         time.Now().UTC(),
	}

	if err := repo.CreateTask(r.Context(), task); err != nil {
		writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
		return
	}

	writeAdminJSON(w, http.StatusOK, map[string]any{"task": task})
}

func handleTaskByID(w http.ResponseWriter, r *http.Request, taskID uuid.UUID, repo adminInterviewPrepRepo) {
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
		var req struct {
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
			IsActive          bool   `json:"isActive"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": "bad request"})
			return
		}

		prepType := model.InterviewPrepType(req.PrepType)
		if prepType == "" {
			prepType = model.InterviewPrepTypeCoding
		}

		task := &model.InterviewPrepTask{
			ID:                taskID,
			Slug:              req.Slug,
			Title:             req.Title,
			Statement:         req.Statement,
			PrepType:          prepType,
			Language:          req.Language,
			IsExecutable:      req.IsExecutable,
			ExecutionProfile:  req.ExecutionProfile,
			RunnerMode:        req.RunnerMode,
			DurationSeconds:   req.DurationSeconds,
			StarterCode:       req.StarterCode,
			ReferenceSolution: req.ReferenceSolution,
			IsActive:          req.IsActive,
		}

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

func handleQuestions(w http.ResponseWriter, r *http.Request, taskID uuid.UUID, repo adminInterviewPrepRepo) {
	if r.Method == http.MethodGet {
		questions, err := repo.ListQuestionsByTask(r.Context(), taskID)
		if err != nil {
			writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}
		writeAdminJSON(w, http.StatusOK, map[string]any{"questions": questions})
		return
	}

	if r.Method == http.MethodPost {
		var req struct {
			Position int32  `json:"position"`
			Prompt   string `json:"prompt"`
			Answer   string `json:"answer"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": "bad request"})
			return
		}

		question := &model.InterviewPrepQuestion{
			ID:        uuid.New(),
			TaskID:    taskID,
			Position:  req.Position,
			Prompt:    req.Prompt,
			Answer:    req.Answer,
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}

		if err := repo.CreateQuestion(r.Context(), question); err != nil {
			writeAdminJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error()})
			return
		}

		writeAdminJSON(w, http.StatusOK, map[string]any{"question": question})
		return
	}

	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

func handleQuestionByID(w http.ResponseWriter, r *http.Request, taskID, questionID uuid.UUID, repo adminInterviewPrepRepo) {
	switch r.Method {
	case http.MethodPut:
		var req struct {
			Position int32  `json:"position"`
			Prompt   string `json:"prompt"`
			Answer   string `json:"answer"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeAdminJSON(w, http.StatusBadRequest, map[string]any{"error": "bad request"})
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

func adminCheckAuth(r *http.Request, authorizer adminInterviewPrepAuthorizer) (*model.User, *adminAuthError) {
	if r == nil || authorizer == nil {
		return nil, &adminAuthError{status: http.StatusUnauthorized, response: map[string]any{"error": "unauthorized"}}
	}

	// Check Authorization header first
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if token != "" {
			authState, err := authorizer.AuthenticateByToken(r.Context(), token)
			if err == nil && authState != nil && authState.User != nil {
				return authState.User, nil
			}
		}
	}

	// Fall back to cookie
	cookie, err := r.Cookie(authorizer.CookieName())
	if err != nil {
		return nil, &adminAuthError{status: http.StatusUnauthorized, response: map[string]any{"error": "unauthorized"}}
	}

	authState, err := authorizer.AuthenticateByToken(r.Context(), cookie.Value)
	if err != nil || authState == nil || authState.User == nil {
		return nil, &adminAuthError{status: http.StatusUnauthorized, response: map[string]any{"error": "unauthorized"}}
	}

	return authState.User, nil
}

type adminAuthError struct {
	status    int
	response  map[string]any
}

func writeAdminJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}