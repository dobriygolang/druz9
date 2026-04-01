package interviewprephttp

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	appinterviewprep "api/internal/app/interviewprep"
	"api/internal/model"

	"github.com/google/uuid"
)

func handleTasks(service Service, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := actorFromRequest(r, authorizer)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
			return
		}
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		items, err := service.ListTasks(r.Context(), user)
		if err != nil {
			writeError(w, err)
			return
		}

		taskResponses := make([]*taskResponse, len(items))
		for i, task := range items {
			taskResponses[i] = mapTask(task)
		}
		writeJSON(w, http.StatusOK, map[string]any{"tasks": taskResponses})
	}
}

func handleSessions(service Service, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := actorFromRequest(r, authorizer)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
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
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"session": mapSession(session, false)})
	}
}

func handleSessionResource(service Service, authorizer Authorizer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := actorFromRequest(r, authorizer)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
			return
		}

		path := strings.TrimPrefix(r.URL.Path, SessionsPath+"/")
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
				writeError(w, err)
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"session": mapSession(session, false)})
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
				writeError(w, err)
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"result": mapSubmitResult(result)})
			return
		}

		if len(parts) == 4 && parts[1] == "questions" && parts[3] == "answer" && r.Method == http.MethodPost {
			handleQuestionAnswer(w, r, service, user, sessionID, parts[2])
			return
		}

		http.Error(w, "not found", http.StatusNotFound)
	}
}

func handleQuestionAnswer(
	w http.ResponseWriter,
	r *http.Request,
	service Service,
	user *model.User,
	sessionID uuid.UUID,
	questionIDRaw string,
) {
	questionID, err := uuid.Parse(questionIDRaw)
	if err != nil {
		http.Error(w, "bad question id", http.StatusBadRequest)
		return
	}

	before, err := service.GetSession(r.Context(), user, sessionID)
	if err != nil {
		writeError(w, err)
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
		writeError(w, err)
		return
	}

	var answeredQuestion *questionResponse
	if before != nil && before.CurrentQuestion != nil && before.CurrentQuestion.ID == questionID {
		answeredQuestion = mapQuestion(before.CurrentQuestion, true)
	}

	writeJSON(w, http.StatusOK, answerResponse{
		AnsweredQuestion: answeredQuestion,
		Session:          mapSession(session, false),
	})
}

func writeError(w http.ResponseWriter, err error) {
	if errors.Is(err, appinterviewprep.ErrForbidden) {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	if errors.Is(err, appinterviewprep.ErrTaskNotFound) || errors.Is(err, appinterviewprep.ErrSessionNotFound) {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	if errors.Is(err, appinterviewprep.ErrSessionFinished) ||
		errors.Is(err, appinterviewprep.ErrSubmitNotAllowed) ||
		errors.Is(err, appinterviewprep.ErrQuestionLocked) ||
		errors.Is(err, appinterviewprep.ErrInvalidAssessment) ||
		errors.Is(err, appinterviewprep.ErrUnsupportedLanguage) ||
		errors.Is(err, appinterviewprep.ErrExecutableTaskNotConfigured) {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	http.Error(w, err.Error(), http.StatusInternalServerError)
}
