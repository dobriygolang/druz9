package interviewprephttp

import (
	"encoding/json"
	"net/http"
	"time"

	appinterviewprep "api/internal/app/interviewprep"
	"api/internal/model"

	"github.com/google/uuid"
)

type taskResponse struct {
	ID                 uuid.UUID  `json:"id"`
	Slug               string     `json:"slug"`
	Title              string     `json:"title"`
	Statement          string     `json:"statement"`
	PrepType           string     `json:"prepType"`
	Language           string     `json:"language"`
	CompanyTag         string     `json:"companyTag"`
	SupportedLanguages []string   `json:"supportedLanguages"`
	IsExecutable       bool       `json:"isExecutable"`
	ExecutionProfile   string     `json:"executionProfile"`
	RunnerMode         string     `json:"runnerMode"`
	DurationSeconds    int32      `json:"durationSeconds"`
	StarterCode        string     `json:"starterCode"`
	CodeTaskID         *uuid.UUID `json:"codeTaskId,omitempty"`
	IsActive           bool       `json:"isActive"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
}

type questionResponse struct {
	ID        uuid.UUID `json:"id"`
	TaskID    uuid.UUID `json:"taskId"`
	Position  int32     `json:"position"`
	Prompt    string    `json:"prompt"`
	Answer    string    `json:"answer,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type sessionResponse struct {
	ID                      uuid.UUID         `json:"id"`
	UserID                  uuid.UUID         `json:"userId"`
	TaskID                  uuid.UUID         `json:"taskId"`
	Status                  string            `json:"status"`
	CurrentQuestionPosition int32             `json:"currentQuestionPosition"`
	SolveLanguage           string            `json:"solveLanguage"`
	Code                    string            `json:"code"`
	LastSubmissionPassed    bool              `json:"lastSubmissionPassed"`
	StartedAt               time.Time         `json:"startedAt"`
	FinishedAt              *time.Time        `json:"finishedAt,omitempty"`
	CreatedAt               time.Time         `json:"createdAt"`
	UpdatedAt               time.Time         `json:"updatedAt"`
	Task                    *taskResponse     `json:"task,omitempty"`
	CurrentQuestion         *questionResponse `json:"currentQuestion,omitempty"`
	Results                 []*resultResponse `json:"results,omitempty"`
}

type resultResponse struct {
	ID             uuid.UUID `json:"id"`
	SessionID      uuid.UUID `json:"sessionId"`
	QuestionID     uuid.UUID `json:"questionId"`
	SelfAssessment string    `json:"selfAssessment"`
	AnsweredAt     time.Time `json:"answeredAt"`
}

type submitResponse struct {
	Passed          bool             `json:"passed"`
	LastError       string           `json:"lastError"`
	PassedCount     int32            `json:"passedCount"`
	TotalCount      int32            `json:"totalCount"`
	FailedTestIndex int32            `json:"failedTestIndex"`
	FailureKind     string           `json:"failureKind"`
	Session         *sessionResponse `json:"session,omitempty"`
}

type answerResponse struct {
	AnsweredQuestion *questionResponse `json:"answeredQuestion,omitempty"`
	Session          *sessionResponse  `json:"session,omitempty"`
}

type systemDesignReviewResponse struct {
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

func mapResult(result *model.InterviewPrepQuestionResult) *resultResponse {
	if result == nil {
		return nil
	}
	return &resultResponse{
		ID:             result.ID,
		SessionID:      result.SessionID,
		QuestionID:     result.QuestionID,
		SelfAssessment: result.SelfAssessment.String(),
		AnsweredAt:     result.AnsweredAt,
	}
}

func mapTask(task *model.InterviewPrepTask) *taskResponse {
	if task == nil {
		return nil
	}
	return &taskResponse{
		ID:                 task.ID,
		Slug:               task.Slug,
		Title:              task.Title,
		Statement:          task.Statement,
		PrepType:           task.PrepType.String(),
		Language:           task.Language,
		CompanyTag:         task.CompanyTag,
		SupportedLanguages: append([]string{}, task.SupportedLanguages...),
		IsExecutable:       task.IsExecutable,
		ExecutionProfile:   task.ExecutionProfile,
		RunnerMode:         task.RunnerMode,
		DurationSeconds:    task.DurationSeconds,
		StarterCode:        task.StarterCode,
		CodeTaskID:         task.CodeTaskID,
		IsActive:           task.IsActive,
		CreatedAt:          task.CreatedAt,
		UpdatedAt:          task.UpdatedAt,
	}
}

func mapQuestion(q *model.InterviewPrepQuestion, includeAnswer bool) *questionResponse {
	if q == nil {
		return nil
	}
	resp := &questionResponse{
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

func mapSession(session *model.InterviewPrepSession, includeAnswer bool) *sessionResponse {
	if session == nil {
		return nil
	}
	resp := &sessionResponse{
		ID:                      session.ID,
		UserID:                  session.UserID,
		TaskID:                  session.TaskID,
		Status:                  session.Status.String(),
		CurrentQuestionPosition: session.CurrentQuestionPosition,
		SolveLanguage:           session.SolveLanguage,
		Code:                    session.Code,
		LastSubmissionPassed:    session.LastSubmissionPassed,
		StartedAt:               session.StartedAt,
		FinishedAt:              session.FinishedAt,
		CreatedAt:               session.CreatedAt,
		UpdatedAt:               session.UpdatedAt,
		Task:                    mapTask(session.Task),
	}
	if session.CurrentQuestion != nil {
		resp.CurrentQuestion = mapQuestion(session.CurrentQuestion, includeAnswer)
	}
	if len(session.Results) > 0 {
		resp.Results = make([]*resultResponse, 0, len(session.Results))
		for _, result := range session.Results {
			resp.Results = append(resp.Results, mapResult(result))
		}
	}
	return resp
}

func mapSubmitResult(result *appinterviewprep.SubmitResult) *submitResponse {
	if result == nil {
		return nil
	}
	return &submitResponse{
		Passed:          result.Passed,
		LastError:       result.LastError,
		PassedCount:     result.PassedCount,
		TotalCount:      result.TotalCount,
		FailedTestIndex: result.FailedTestIndex,
		FailureKind:     result.FailureKind,
		Session:         mapSession(result.Session, false),
	}
}

func mapSystemDesignReview(result *appinterviewprep.SystemDesignReviewResult) *systemDesignReviewResponse {
	if result == nil {
		return nil
	}
	return &systemDesignReviewResponse{
		Provider:          result.Provider,
		Model:             result.Model,
		Score:             result.Score,
		Summary:           result.Summary,
		Strengths:         result.Strengths,
		Issues:            result.Issues,
		MissingTopics:     result.MissingTopics,
		FollowUpQuestions: result.FollowUpQuestions,
		Disclaimer:        result.Disclaimer,
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
