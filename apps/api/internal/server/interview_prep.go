package server

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"api/internal/model"
	appinterviewprep "api/internal/app/interviewprep"

	"github.com/google/uuid"
)

const (
	interviewPrepTasksPath    = "/api/v1/interview-prep/tasks"
	interviewPrepSessionsPath = "/api/v1/interview-prep/sessions"
)

type interviewPrepAuthorizer interface {
	AuthenticateByToken(context.Context, string) (*model.AuthState, error)
	CookieName() string
	DevBypass() bool
	DevUserID() string
}

// Response DTOs without sensitive fields
type interviewPrepTaskResponse struct {
	ID               uuid.UUID `json:"id"`
	Slug             string    `json:"slug"`
	Title            string    `json:"title"`
	Statement        string    `json:"statement"`
	PrepType         string    `json:"prepType"`
	Language         string    `json:"language"`
	IsExecutable     bool      `json:"isExecutable"`
	ExecutionProfile string    `json:"executionProfile"`
	RunnerMode       string    `json:"runnerMode"`
	DurationSeconds  int32     `json:"durationSeconds"`
	StarterCode      string    `json:"starterCode"`
	IsActive         bool      `json:"isActive"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type interviewPrepQuestionResponse struct {
	ID          uuid.UUID `json:"id"`
	TaskID      uuid.UUID `json:"taskId"`
	Position    int32     `json:"position"`
	Prompt      string    `json:"prompt"`
	Answer      string    `json:"answer,omitempty"` // only included when revealed
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type interviewPrepSessionResponse struct {
	ID                      uuid.UUID                      `json:"id"`
	UserID                  uuid.UUID                      `json:"userId"`
	TaskID                  uuid.UUID                      `json:"taskId"`
	Status                  string                         `json:"status"`
	CurrentQuestionPosition int32                          `json:"currentQuestionPosition"`
	Code                    string                         `json:"code"`
	LastSubmissionPassed    bool                           `json:"lastSubmissionPassed"`
	StartedAt               time.Time                      `json:"startedAt"`
	CreatedAt               time.Time                      `json:"createdAt"`
	UpdatedAt               time.Time                      `json:"updatedAt"`
	Task                    *interviewPrepTaskResponse     `json:"task,omitempty"`
	CurrentQuestion         *interviewPrepQuestionResponse `json:"currentQuestion,omitempty"`
}

func mapInterviewPrepTask(task *model.InterviewPrepTask) *interviewPrepTaskResponse {
	if task == nil {
		return nil
	}
	return &interviewPrepTaskResponse{
		ID:               task.ID,
		Slug:             task.Slug,
		Title:            task.Title,
		Statement:        task.Statement,
		PrepType:         task.PrepType.String(),
		Language:         task.Language,
		IsExecutable:     task.IsExecutable,
		ExecutionProfile: task.ExecutionProfile,
		RunnerMode:       task.RunnerMode,
		DurationSeconds:  task.DurationSeconds,
		StarterCode:      task.StarterCode,
		IsActive:         task.IsActive,
		CreatedAt:        task.CreatedAt,
		UpdatedAt:        task.UpdatedAt,
	}
}

func mapInterviewPrepQuestion(q *model.InterviewPrepQuestion, includeAnswer bool) *interviewPrepQuestionResponse {
	if q == nil {
		return nil
	}
	resp := &interviewPrepQuestionResponse{
		ID:        q.ID,
		TaskID:    q.TaskID,
		Position:  q.Position,
		Prompt:    q.Prompt,
		CreatedAt: q.CreatedAt,
		UpdatedAt: q.UpdatedAt,
	}
	if includeAnswer {
		resp.Answer = q.Answer
	}
	return resp
}

func mapInterviewPrepSession(session *model.InterviewPrepSession, includeAnswer bool) *interviewPrepSessionResponse {
	if session == nil {
		return nil
	}
	resp := &interviewPrepSessionResponse{
		ID:                      session.ID,
		UserID:                  session.UserID,
		TaskID:                  session.TaskID,
		Status:                  session.Status.String(),
		CurrentQuestionPosition: session.CurrentQuestionPosition,
		Code:                    session.Code,
		LastSubmissionPassed:    session.LastSubmissionPassed,
		StartedAt:               session.StartedAt,
		CreatedAt:               session.CreatedAt,
		UpdatedAt:               session.UpdatedAt,
		Task:                    mapInterviewPrepTask(session.Task),
	}
	if session.CurrentQuestion != nil {
		resp.CurrentQuestion = mapInterviewPrepQuestion(session.CurrentQuestion, includeAnswer)
	}
	return resp
}

type interviewPrepSubmitResponse struct {
	Passed    bool                         `json:"passed"`
	LastError string                       `json:"lastError"`
	Session   *interviewPrepSessionResponse `json:"session,omitempty"`
}

func mapInterviewPrepSubmitResult(result *appinterviewprep.SubmitResult) *interviewPrepSubmitResponse {
	if result == nil {
		return nil
	}
	return &interviewPrepSubmitResponse{
		Passed:    result.Passed,
		LastError: result.LastError,
		Session:   mapInterviewPrepSession(result.Session, false),
	}
}

type interviewPrepAnswerResponse struct {
	AnsweredQuestion *interviewPrepQuestionResponse `json:"answeredQuestion,omitempty"`
	Session          *interviewPrepSessionResponse  `json:"session,omitempty"`
}

type InterviewPrepService interface {
	ListTasks(ctx context.Context, user *model.User) ([]*model.InterviewPrepTask, error)
	StartSession(ctx context.Context, user *model.User, taskID uuid.UUID) (*model.InterviewPrepSession, error)
	GetSession(ctx context.Context, user *model.User, sessionID uuid.UUID) (*model.InterviewPrepSession, error)
	Submit(ctx context.Context, user *model.User, sessionID uuid.UUID, code string) (*appinterviewprep.SubmitResult, error)
	AnswerQuestion(ctx context.Context, user *model.User, sessionID, questionID uuid.UUID, assessment string) (*model.InterviewPrepSession, error)
}

func RegisterInterviewPrepRoutes(srv interface{ HandlePrefix(prefix string, handler http.Handler) }, service InterviewPrepService, authorizer interviewPrepAuthorizer) {
	handler := interviewPrepHandler(service, authorizer)
	srv.HandlePrefix(interviewPrepTasksPath, handler)
	srv.HandlePrefix(interviewPrepSessionsPath, handler)
}

func interviewPrepHandler(service InterviewPrepService, authorizer interviewPrepAuthorizer) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc(interviewPrepTasksPath, func(w http.ResponseWriter, r *http.Request) {
		user, ok := interviewPrepActorFromRequest(r, authorizer)
		if !ok {
			writeInterviewPrepJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
			return
		}
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		items, err := service.ListTasks(r.Context(), user)
		if err != nil {
			writeInterviewPrepError(w, err)
			return
		}
		taskResponses := make([]*interviewPrepTaskResponse, len(items))
		for i, t := range items {
			taskResponses[i] = mapInterviewPrepTask(t)
		}
		writeInterviewPrepJSON(w, http.StatusOK, map[string]any{"tasks": taskResponses})
	})

	mux.HandleFunc(interviewPrepSessionsPath, func(w http.ResponseWriter, r *http.Request) {
		user, ok := interviewPrepActorFromRequest(r, authorizer)
		if !ok {
			writeInterviewPrepJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
			return
		}
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			TaskID string `json:"taskId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		taskID, err := uuid.Parse(req.TaskID)
		if err != nil {
			http.Error(w, "bad task id", http.StatusBadRequest)
			return
		}

		session, err := service.StartSession(r.Context(), user, taskID)
		if err != nil {
			writeInterviewPrepError(w, err)
			return
		}
		writeInterviewPrepJSON(w, http.StatusOK, map[string]any{"session": mapInterviewPrepSession(session, false)})
	})

	mux.HandleFunc(interviewPrepSessionsPath+"/", func(w http.ResponseWriter, r *http.Request) {
		user, ok := interviewPrepActorFromRequest(r, authorizer)
		if !ok {
			writeInterviewPrepJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
			return
		}

		path := strings.TrimPrefix(r.URL.Path, interviewPrepSessionsPath+"/")
		parts := strings.Split(path, "/")
		if len(parts) == 0 || parts[0] == "" {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		sessionID, err := uuid.Parse(parts[0])
		if err != nil {
			http.Error(w, "bad session id", http.StatusBadRequest)
			return
		}

		if len(parts) == 1 && r.Method == http.MethodGet {
			session, err := service.GetSession(r.Context(), user, sessionID)
			if err != nil {
				writeInterviewPrepError(w, err)
				return
			}
			writeInterviewPrepJSON(w, http.StatusOK, map[string]any{"session": mapInterviewPrepSession(session, false)})
			return
		}

		if len(parts) == 2 && parts[1] == "submit" && r.Method == http.MethodPost {
			var req struct {
				Code string `json:"code"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}
			result, err := service.Submit(r.Context(), user, sessionID, req.Code)
			if err != nil {
				writeInterviewPrepError(w, err)
				return
			}
			writeInterviewPrepJSON(w, http.StatusOK, map[string]any{"result": mapInterviewPrepSubmitResult(result)})
			return
		}

		if len(parts) == 4 && parts[1] == "questions" && parts[3] == "answer" && r.Method == http.MethodPost {
			questionID, err := uuid.Parse(parts[2])
			if err != nil {
				http.Error(w, "bad question id", http.StatusBadRequest)
				return
			}

			// Get current session to capture the answered question before advancing
			before, err := service.GetSession(r.Context(), user, sessionID)
			if err != nil {
				writeInterviewPrepError(w, err)
				return
			}

			var req struct {
				SelfAssessment string `json:"selfAssessment"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}

			session, err := service.AnswerQuestion(r.Context(), user, sessionID, questionID, req.SelfAssessment)
			if err != nil {
				writeInterviewPrepError(w, err)
				return
			}

			// Return the answered question with answer, and session with next question without answer
			var answeredQuestion *interviewPrepQuestionResponse
			if before != nil && before.CurrentQuestion != nil && before.CurrentQuestion.ID == questionID {
				answeredQuestion = mapInterviewPrepQuestion(before.CurrentQuestion, true)
			}

			writeInterviewPrepJSON(w, http.StatusOK, interviewPrepAnswerResponse{
				AnsweredQuestion: answeredQuestion,
				Session:          mapInterviewPrepSession(session, false),
			})
			return
		}

		http.Error(w, "not found", http.StatusNotFound)
	})

	return mux
}

func interviewPrepActorFromRequest(r *http.Request, authorizer interviewPrepAuthorizer) (*model.User, bool) {
	if r == nil {
		return nil, false
	}
	if authorizer != nil {
		if authorizer.DevBypass() {
			if parsedID, err := uuid.Parse(authorizer.DevUserID()); err == nil {
				return &model.User{ID: parsedID, Status: model.UserStatusActive, IsTrusted: true}, true
			}
		}
		if rawToken := interviewPrepSessionToken(r, authorizer.CookieName()); rawToken != "" {
			if authState, err := authorizer.AuthenticateByToken(r.Context(), rawToken); err == nil && authState != nil && authState.User != nil {
				return authState.User, true
			}
		}
	}
	return nil, false
}

func interviewPrepSessionToken(r *http.Request, cookieName string) string {
	cookie, err := r.Cookie(cookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}

func writeInterviewPrepError(w http.ResponseWriter, err error) {
	if errors.Is(err, appinterviewprep.ErrForbidden) {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	if errors.Is(err, appinterviewprep.ErrTaskNotFound) ||
		errors.Is(err, appinterviewprep.ErrSessionNotFound) {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	if errors.Is(err, appinterviewprep.ErrSessionFinished) ||
		errors.Is(err, appinterviewprep.ErrSubmitNotAllowed) ||
		errors.Is(err, appinterviewprep.ErrQuestionLocked) ||
		errors.Is(err, appinterviewprep.ErrInvalidAssessment) ||
		errors.Is(err, appinterviewprep.ErrUnsupportedLanguage) ||
		errors.Is(err, appinterviewprep.ErrExecutableTasksNotSupported) {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	http.Error(w, err.Error(), http.StatusInternalServerError)
}

func writeInterviewPrepJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}