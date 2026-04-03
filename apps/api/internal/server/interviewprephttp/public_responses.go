package interviewprephttp

import (
	"encoding/json"
	"net/http"
	"time"

	"api/internal/aireview"
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
	AnsweredQuestion *questionResponse              `json:"answeredQuestion,omitempty"`
	Review           *interviewAnswerReviewResponse `json:"review,omitempty"`
	Session          *sessionResponse               `json:"session,omitempty"`
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

type interviewSolutionReviewResponse struct {
	Provider          string   `json:"provider"`
	Model             string   `json:"model"`
	Score             int      `json:"score"`
	Summary           string   `json:"summary"`
	Strengths         []string `json:"strengths"`
	Issues            []string `json:"issues"`
	FollowUpQuestions []string `json:"followUpQuestions"`
}

type interviewAnswerReviewResponse struct {
	Provider string   `json:"provider"`
	Model    string   `json:"model"`
	Score    int      `json:"score"`
	Summary  string   `json:"summary"`
	Gaps     []string `json:"gaps"`
}

type mockQuestionResultResponse struct {
	ID          uuid.UUID  `json:"id"`
	StageID     uuid.UUID  `json:"stageId"`
	Position    int32      `json:"position"`
	QuestionKey string     `json:"questionKey"`
	Prompt      string     `json:"prompt"`
	Score       int32      `json:"score"`
	Summary     string     `json:"summary"`
	AnsweredAt  *time.Time `json:"answeredAt,omitempty"`
}

type mockStageResponse struct {
	ID                   uuid.UUID                     `json:"id"`
	SessionID            uuid.UUID                     `json:"sessionId"`
	StageIndex           int32                         `json:"stageIndex"`
	Kind                 string                        `json:"kind"`
	Status               string                        `json:"status"`
	TaskID               uuid.UUID                     `json:"taskId"`
	SolveLanguage        string                        `json:"solveLanguage"`
	Code                 string                        `json:"code"`
	LastSubmissionPassed bool                          `json:"lastSubmissionPassed"`
	ReviewScore          int32                         `json:"reviewScore"`
	ReviewSummary        string                        `json:"reviewSummary"`
	StartedAt            time.Time                     `json:"startedAt"`
	FinishedAt           *time.Time                    `json:"finishedAt,omitempty"`
	CreatedAt            time.Time                     `json:"createdAt"`
	UpdatedAt            time.Time                     `json:"updatedAt"`
	Task                 *taskResponse                 `json:"task,omitempty"`
	QuestionResults      []*mockQuestionResultResponse `json:"questionResults,omitempty"`
	CurrentQuestion      *mockQuestionResultResponse   `json:"currentQuestion,omitempty"`
}

type mockSessionResponse struct {
	ID                uuid.UUID            `json:"id"`
	UserID            uuid.UUID            `json:"userId"`
	CompanyTag        string               `json:"companyTag"`
	Status            string               `json:"status"`
	CurrentStageIndex int32                `json:"currentStageIndex"`
	StartedAt         time.Time            `json:"startedAt"`
	FinishedAt        *time.Time           `json:"finishedAt,omitempty"`
	CreatedAt         time.Time            `json:"createdAt"`
	UpdatedAt         time.Time            `json:"updatedAt"`
	Stages            []*mockStageResponse `json:"stages,omitempty"`
	CurrentStage      *mockStageResponse   `json:"currentStage,omitempty"`
}

type mockSubmitResponse struct {
	Passed          bool                             `json:"passed"`
	LastError       string                           `json:"lastError"`
	PassedCount     int32                            `json:"passedCount"`
	TotalCount      int32                            `json:"totalCount"`
	FailedTestIndex int32                            `json:"failedTestIndex"`
	FailureKind     string                           `json:"failureKind"`
	Review          *interviewSolutionReviewResponse `json:"review,omitempty"`
	Session         *mockSessionResponse             `json:"session,omitempty"`
}

type mockQuestionAnswerResponse struct {
	Review  *interviewAnswerReviewResponse `json:"review,omitempty"`
	Session *mockSessionResponse           `json:"session,omitempty"`
}

type mockSystemDesignReviewResponse struct {
	Review  *systemDesignReviewResponse `json:"review,omitempty"`
	Session *mockSessionResponse        `json:"session,omitempty"`
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
	return mapTaskWithOptions(task, true)
}

func mapTaskWithOptions(task *model.InterviewPrepTask, includeStarterCode bool) *taskResponse {
	if task == nil {
		return nil
	}
	resp := &taskResponse{
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
		CodeTaskID:         task.CodeTaskID,
		IsActive:           task.IsActive,
		CreatedAt:          task.CreatedAt,
		UpdatedAt:          task.UpdatedAt,
	}
	if includeStarterCode {
		resp.StarterCode = task.StarterCode
	}
	return resp
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

func mapInterviewSolutionReview(result *aireview.InterviewSolutionReview) *interviewSolutionReviewResponse {
	if result == nil {
		return nil
	}
	return &interviewSolutionReviewResponse{
		Provider:          result.Provider,
		Model:             result.Model,
		Score:             result.Score,
		Summary:           result.Summary,
		Strengths:         result.Strengths,
		Issues:            result.Issues,
		FollowUpQuestions: result.FollowUpQuestions,
	}
}

func mapInterviewAnswerReview(result *aireview.InterviewAnswerReview) *interviewAnswerReviewResponse {
	if result == nil {
		return nil
	}
	return &interviewAnswerReviewResponse{
		Provider: result.Provider,
		Model:    result.Model,
		Score:    result.Score,
		Summary:  result.Summary,
		Gaps:     result.Gaps,
	}
}

func mapMockQuestionResult(result *model.InterviewPrepMockQuestionResult) *mockQuestionResultResponse {
	if result == nil {
		return nil
	}
	return &mockQuestionResultResponse{
		ID:          result.ID,
		StageID:     result.StageID,
		Position:    result.Position,
		QuestionKey: result.QuestionKey,
		Prompt:      result.Prompt,
		Score:       result.Score,
		Summary:     result.Summary,
		AnsweredAt:  result.AnsweredAt,
	}
}

func mapMockStage(stage *model.InterviewPrepMockStage) *mockStageResponse {
	return mapMockStageWithOptions(stage, true, true, true)
}

func mapMockStageWithOptions(stage *model.InterviewPrepMockStage, includeCode bool, includeTaskStarter bool, includeQuestions bool) *mockStageResponse {
	if stage == nil {
		return nil
	}
	resp := &mockStageResponse{
		ID:                   stage.ID,
		SessionID:            stage.SessionID,
		StageIndex:           stage.StageIndex,
		Kind:                 stage.Kind.String(),
		Status:               stage.Status.String(),
		TaskID:               stage.TaskID,
		SolveLanguage:        stage.SolveLanguage,
		LastSubmissionPassed: stage.LastSubmissionPassed,
		ReviewScore:          stage.ReviewScore,
		ReviewSummary:        stage.ReviewSummary,
		StartedAt:            stage.StartedAt,
		FinishedAt:           stage.FinishedAt,
		CreatedAt:            stage.CreatedAt,
		UpdatedAt:            stage.UpdatedAt,
		Task:                 mapTaskWithOptions(stage.Task, includeTaskStarter),
	}
	if includeCode {
		resp.Code = stage.Code
	}
	if includeQuestions && len(stage.QuestionResults) > 0 {
		resp.QuestionResults = make([]*mockQuestionResultResponse, 0, len(stage.QuestionResults))
		for _, item := range stage.QuestionResults {
			resp.QuestionResults = append(resp.QuestionResults, mapMockQuestionResult(item))
		}
	}
	if includeQuestions && stage.CurrentQuestion != nil {
		resp.CurrentQuestion = mapMockQuestionResult(stage.CurrentQuestion)
	}
	return resp
}

func mapMockSession(session *model.InterviewPrepMockSession) *mockSessionResponse {
	return mapMockSessionWithOptions(session, false)
}

func mapMockSessionWithOptions(session *model.InterviewPrepMockSession, verbose bool) *mockSessionResponse {
	if session == nil {
		return nil
	}
	resp := &mockSessionResponse{
		ID:                session.ID,
		UserID:            session.UserID,
		CompanyTag:        session.CompanyTag,
		Status:            session.Status.String(),
		CurrentStageIndex: session.CurrentStageIndex,
		StartedAt:         session.StartedAt,
		FinishedAt:        session.FinishedAt,
		CreatedAt:         session.CreatedAt,
		UpdatedAt:         session.UpdatedAt,
	}
	if len(session.Stages) > 0 {
		resp.Stages = make([]*mockStageResponse, 0, len(session.Stages))
		for _, stage := range session.Stages {
			includeDetails := verbose || (session.CurrentStage != nil && stage.ID == session.CurrentStage.ID)
			resp.Stages = append(resp.Stages, mapMockStageWithOptions(stage, includeDetails, includeDetails, includeDetails))
		}
	}
	if session.CurrentStage != nil {
		resp.CurrentStage = mapMockStageWithOptions(session.CurrentStage, true, true, true)
	}
	return resp
}

func mapMockSubmitResult(result *appinterviewprep.MockSubmitResult) *mockSubmitResponse {
	if result == nil {
		return nil
	}
	return &mockSubmitResponse{
		Passed:          result.Passed,
		LastError:       result.LastError,
		PassedCount:     result.PassedCount,
		TotalCount:      result.TotalCount,
		FailedTestIndex: result.FailedTestIndex,
		FailureKind:     result.FailureKind,
		Review:          mapInterviewSolutionReview(result.Review),
		Session:         mapMockSessionWithOptions(result.Session, false),
	}
}

func mapMockQuestionAnswerResult(result *appinterviewprep.MockQuestionAnswerResult) *mockQuestionAnswerResponse {
	if result == nil {
		return nil
	}
	return &mockQuestionAnswerResponse{
		Review:  mapInterviewAnswerReview(result.Review),
		Session: mapMockSessionWithOptions(result.Session, false),
	}
}

func mapMockSystemDesignReviewResult(result *appinterviewprep.MockSystemDesignReviewResult) *mockSystemDesignReviewResponse {
	if result == nil {
		return nil
	}
	return &mockSystemDesignReviewResponse{
		Review:  mapSystemDesignReview(result.Review),
		Session: mapMockSessionWithOptions(result.Session, false),
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
