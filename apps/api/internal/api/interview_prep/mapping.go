package interview_prep

import (
	"time"

	"api/internal/aireview"
	appinterviewprep "api/internal/app/interviewprep"
	"api/internal/model"
	v1 "api/pkg/api/interview_prep/v1"
)

func timeString(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339Nano)
}

func timePtrString(t *time.Time) string {
	if t == nil || t.IsZero() {
		return ""
	}
	return t.UTC().Format(time.RFC3339Nano)
}

func mapTask(task *model.InterviewPrepTask) *v1.InterviewPrepTask {
	if task == nil {
		return nil
	}
	codeTaskID := ""
	if task.CodeTaskID != nil {
		codeTaskID = task.CodeTaskID.String()
	}
	return &v1.InterviewPrepTask{
		Id:                 task.ID.String(),
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
		ReferenceSolution:  task.ReferenceSolution,
		CodeTaskId:         codeTaskID,
		IsActive:           task.IsActive,
		CreatedAt:          timeString(task.CreatedAt),
		UpdatedAt:          timeString(task.UpdatedAt),
	}
}

func mapQuestion(question *model.InterviewPrepQuestion) *v1.InterviewPrepQuestion {
	if question == nil {
		return nil
	}
	return &v1.InterviewPrepQuestion{
		Id:        question.ID.String(),
		TaskId:    question.TaskID.String(),
		Position:  question.Position,
		Prompt:    question.Prompt,
		Answer:    question.Answer,
		CreatedAt: timeString(question.CreatedAt),
		UpdatedAt: timeString(question.UpdatedAt),
	}
}

func mapQuestionResult(result *model.InterviewPrepQuestionResult) *v1.InterviewPrepQuestionResult {
	if result == nil {
		return nil
	}
	return &v1.InterviewPrepQuestionResult{
		Id:             result.ID.String(),
		SessionId:      result.SessionID.String(),
		QuestionId:     result.QuestionID.String(),
		SelfAssessment: result.SelfAssessment.String(),
		AnsweredAt:     timeString(result.AnsweredAt),
	}
}

func mapSession(session *model.InterviewPrepSession) *v1.InterviewPrepSession {
	if session == nil {
		return nil
	}
	results := make([]*v1.InterviewPrepQuestionResult, 0, len(session.Results))
	for _, result := range session.Results {
		results = append(results, mapQuestionResult(result))
	}
	return &v1.InterviewPrepSession{
		Id:                      session.ID.String(),
		UserId:                  session.UserID.String(),
		TaskId:                  session.TaskID.String(),
		Status:                  session.Status.String(),
		CurrentQuestionPosition: session.CurrentQuestionPosition,
		SolveLanguage:           session.SolveLanguage,
		Code:                    session.Code,
		LastSubmissionPassed:    session.LastSubmissionPassed,
		StartedAt:               timeString(session.StartedAt),
		FinishedAt:              timePtrString(session.FinishedAt),
		CreatedAt:               timeString(session.CreatedAt),
		UpdatedAt:               timeString(session.UpdatedAt),
		Task:                    mapTask(session.Task),
		CurrentQuestion:         mapQuestion(session.CurrentQuestion),
		Results:                 results,
	}
}

func mapSystemDesignReview(review *appinterviewprep.SystemDesignReviewResult) *v1.SystemDesignReview {
	if review == nil {
		return nil
	}
	return &v1.SystemDesignReview{
		Provider:          review.Provider,
		Model:             review.Model,
		Score:             int32(review.Score),
		Summary:           review.Summary,
		Strengths:         review.Strengths,
		Issues:            review.Issues,
		MissingTopics:     review.MissingTopics,
		FollowUpQuestions: review.FollowUpQuestions,
		Disclaimer:        review.Disclaimer,
	}
}

func mapInterviewSolutionReview(review *aireview.InterviewSolutionReview) *v1.InterviewSolutionReview {
	if review == nil {
		return nil
	}
	return &v1.InterviewSolutionReview{
		Provider:          review.Provider,
		Model:             review.Model,
		Score:             int32(review.Score),
		Summary:           review.Summary,
		Strengths:         review.Strengths,
		Issues:            review.Issues,
		FollowUpQuestions: review.FollowUpQuestions,
	}
}

func mapInterviewAnswerReview(review *aireview.InterviewAnswerReview) *v1.InterviewAnswerReview {
	if review == nil {
		return nil
	}
	return &v1.InterviewAnswerReview{
		Provider: review.Provider,
		Model:    review.Model,
		Score:    int32(review.Score),
		Summary:  review.Summary,
		Gaps:     review.Gaps,
	}
}

func mapMockQuestionResult(result *model.InterviewPrepMockQuestionResult) *v1.MockQuestionResult {
	if result == nil {
		return nil
	}
	return &v1.MockQuestionResult{
		Id:              result.ID.String(),
		StageId:         result.StageID.String(),
		Position:        result.Position,
		QuestionKey:     result.QuestionKey,
		Prompt:          result.Prompt,
		ReferenceAnswer: result.ReferenceAnswer,
		Score:           result.Score,
		Summary:         result.Summary,
		AnsweredAt:      timePtrString(result.AnsweredAt),
		CreatedAt:       timeString(result.CreatedAt),
		UpdatedAt:       timeString(result.UpdatedAt),
	}
}

func mapMockStage(stage *model.InterviewPrepMockStage) *v1.MockStage {
	if stage == nil {
		return nil
	}
	questions := make([]*v1.MockQuestionResult, 0, len(stage.QuestionResults))
	for _, question := range stage.QuestionResults {
		questions = append(questions, mapMockQuestionResult(question))
	}
	return &v1.MockStage{
		Id:                   stage.ID.String(),
		SessionId:            stage.SessionID.String(),
		StageIndex:           stage.StageIndex,
		Kind:                 stage.Kind.String(),
		Status:               stage.Status.String(),
		TaskId:               stage.TaskID.String(),
		SolveLanguage:        stage.SolveLanguage,
		Code:                 stage.Code,
		LastSubmissionPassed: stage.LastSubmissionPassed,
		ReviewScore:          stage.ReviewScore,
		ReviewSummary:        stage.ReviewSummary,
		StartedAt:            timeString(stage.StartedAt),
		FinishedAt:           timePtrString(stage.FinishedAt),
		CreatedAt:            timeString(stage.CreatedAt),
		UpdatedAt:            timeString(stage.UpdatedAt),
		Task:                 mapTask(stage.Task),
		QuestionResults:      questions,
		CurrentQuestion:      mapMockQuestionResult(stage.CurrentQuestion),
	}
}

func mapMockSession(session *model.InterviewPrepMockSession) *v1.MockSession {
	if session == nil {
		return nil
	}
	stages := make([]*v1.MockStage, 0, len(session.Stages))
	for _, stage := range session.Stages {
		stages = append(stages, mapMockStage(stage))
	}
	return &v1.MockSession{
		Id:                session.ID.String(),
		UserId:            session.UserID.String(),
		CompanyTag:        session.CompanyTag,
		Status:            session.Status.String(),
		CurrentStageIndex: session.CurrentStageIndex,
		StartedAt:         timeString(session.StartedAt),
		FinishedAt:        timePtrString(session.FinishedAt),
		CreatedAt:         timeString(session.CreatedAt),
		UpdatedAt:         timeString(session.UpdatedAt),
		Stages:            stages,
		CurrentStage:      mapMockStage(session.CurrentStage),
	}
}

func mapMockQuestionPoolItem(item *model.InterviewPrepMockQuestionPoolItem) *v1.MockQuestionPoolItem {
	if item == nil {
		return nil
	}
	return &v1.MockQuestionPoolItem{
		Id:              item.ID.String(),
		Topic:           item.Topic,
		CompanyTag:      item.CompanyTag,
		QuestionKey:     item.QuestionKey,
		Prompt:          item.Prompt,
		ReferenceAnswer: item.ReferenceAnswer,
		Position:        item.Position,
		AlwaysAsk:       item.AlwaysAsk,
		IsActive:        item.IsActive,
		CreatedAt:       timeString(item.CreatedAt),
		UpdatedAt:       timeString(item.UpdatedAt),
	}
}

func mapMockCompanyPreset(item *model.InterviewPrepMockCompanyPreset) *v1.MockCompanyPreset {
	if item == nil {
		return nil
	}
	return &v1.MockCompanyPreset{
		Id:              item.ID.String(),
		CompanyTag:      item.CompanyTag,
		StageKind:       item.StageKind.String(),
		Position:        item.Position,
		TaskSlugPattern: item.TaskSlugPattern,
		AiModelOverride: item.AIModelOverride,
		IsActive:        item.IsActive,
		CreatedAt:       timeString(item.CreatedAt),
		UpdatedAt:       timeString(item.UpdatedAt),
	}
}
