package interview_prep

import (
	"api/internal/aireview"
	appinterviewprep "api/internal/app/interviewprep"
	"api/internal/model"
	v1 "api/pkg/api/interview_prep/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

// ── Enum mappings ──────────────────────────────────────────────────────────

func mapPrepType(t model.InterviewPrepType) v1.PrepType {
	switch t {
	case model.InterviewPrepTypeCoding:
		return v1.PrepType_PREP_TYPE_CODING
	case model.InterviewPrepTypeAlgorithm:
		return v1.PrepType_PREP_TYPE_ALGORITHM
	case model.InterviewPrepTypeSystemDesign:
		return v1.PrepType_PREP_TYPE_SYSTEM_DESIGN
	case model.InterviewPrepTypeSQL:
		return v1.PrepType_PREP_TYPE_SQL
	case model.InterviewPrepTypeCodeReview:
		return v1.PrepType_PREP_TYPE_CODE_REVIEW
	default:
		return v1.PrepType_PREP_TYPE_UNSPECIFIED
	}
}

func unmapPrepType(t v1.PrepType) model.InterviewPrepType {
	switch t {
	case v1.PrepType_PREP_TYPE_CODING:
		return model.InterviewPrepTypeCoding
	case v1.PrepType_PREP_TYPE_ALGORITHM:
		return model.InterviewPrepTypeAlgorithm
	case v1.PrepType_PREP_TYPE_SYSTEM_DESIGN:
		return model.InterviewPrepTypeSystemDesign
	case v1.PrepType_PREP_TYPE_SQL:
		return model.InterviewPrepTypeSQL
	case v1.PrepType_PREP_TYPE_CODE_REVIEW:
		return model.InterviewPrepTypeCodeReview
	default:
		return model.InterviewPrepTypeUnknown
	}
}

func mapSessionStatus(s model.InterviewPrepSessionStatus) v1.SessionStatus {
	switch s {
	case model.InterviewPrepSessionStatusActive:
		return v1.SessionStatus_SESSION_STATUS_ACTIVE
	case model.InterviewPrepSessionStatusFinished:
		return v1.SessionStatus_SESSION_STATUS_FINISHED
	default:
		return v1.SessionStatus_SESSION_STATUS_UNSPECIFIED
	}
}

func mapMockSessionStatus(s model.InterviewPrepMockSessionStatus) v1.MockSessionStatus {
	switch s {
	case model.InterviewPrepMockSessionStatusActive:
		return v1.MockSessionStatus_MOCK_SESSION_STATUS_ACTIVE
	case model.InterviewPrepMockSessionStatusFinished:
		return v1.MockSessionStatus_MOCK_SESSION_STATUS_FINISHED
	default:
		return v1.MockSessionStatus_MOCK_SESSION_STATUS_UNSPECIFIED
	}
}

func mapMockStageKind(k model.InterviewPrepMockStageKind) v1.MockStageKind {
	switch k {
	case model.InterviewPrepMockStageKindSlices:
		return v1.MockStageKind_MOCK_STAGE_KIND_SLICES
	case model.InterviewPrepMockStageKindConcurrency:
		return v1.MockStageKind_MOCK_STAGE_KIND_CONCURRENCY
	case model.InterviewPrepMockStageKindSQL:
		return v1.MockStageKind_MOCK_STAGE_KIND_SQL
	case model.InterviewPrepMockStageKindArchitecture:
		return v1.MockStageKind_MOCK_STAGE_KIND_ARCHITECTURE
	case model.InterviewPrepMockStageKindSystemDesign:
		return v1.MockStageKind_MOCK_STAGE_KIND_SYSTEM_DESIGN
	default:
		return v1.MockStageKind_MOCK_STAGE_KIND_UNSPECIFIED
	}
}

func mapMockStageStatus(s model.InterviewPrepMockStageStatus) v1.MockStageStatus {
	switch s {
	case model.InterviewPrepMockStageStatusPending:
		return v1.MockStageStatus_MOCK_STAGE_STATUS_PENDING
	case model.InterviewPrepMockStageStatusSolving:
		return v1.MockStageStatus_MOCK_STAGE_STATUS_SOLVING
	case model.InterviewPrepMockStageStatusQuestions:
		return v1.MockStageStatus_MOCK_STAGE_STATUS_QUESTIONS
	case model.InterviewPrepMockStageStatusCompleted:
		return v1.MockStageStatus_MOCK_STAGE_STATUS_COMPLETED
	default:
		return v1.MockStageStatus_MOCK_STAGE_STATUS_UNSPECIFIED
	}
}

func mapSelfAssessment(s model.InterviewPrepSelfAssessment) v1.SelfAssessment {
	switch s {
	case model.InterviewPrepSelfAssessmentAnswered:
		return v1.SelfAssessment_SELF_ASSESSMENT_ANSWERED
	case model.InterviewPrepSelfAssessmentSkipped:
		return v1.SelfAssessment_SELF_ASSESSMENT_SKIPPED
	default:
		return v1.SelfAssessment_SELF_ASSESSMENT_UNSPECIFIED
	}
}

func unmapSelfAssessment(s v1.SelfAssessment) model.InterviewPrepSelfAssessment {
	switch s {
	case v1.SelfAssessment_SELF_ASSESSMENT_ANSWERED:
		return model.InterviewPrepSelfAssessmentAnswered
	case v1.SelfAssessment_SELF_ASSESSMENT_SKIPPED:
		return model.InterviewPrepSelfAssessmentSkipped
	default:
		return model.InterviewPrepSelfAssessmentUnknown
	}
}

// ── Entity mappings ────────────────────────────────────────────────────────

func mapProgrammingLanguage(lang string) v1.ProgrammingLanguage {
	switch lang {
	case "javascript":
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVASCRIPT
	case "typescript":
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_TYPESCRIPT
	case "python":
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_PYTHON
	case "go":
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_GO
	case "rust":
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_RUST
	case "cpp":
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_CPP
	case "java":
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVA
	case "sql":
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_SQL
	default:
		return v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_UNSPECIFIED
	}
}

func unmapProgrammingLanguage(lang v1.ProgrammingLanguage) string {
	switch lang {
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVASCRIPT:
		return "javascript"
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_TYPESCRIPT:
		return "typescript"
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_PYTHON:
		return "python"
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_GO:
		return "go"
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_RUST:
		return "rust"
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_CPP:
		return "cpp"
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_JAVA:
		return "java"
	case v1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_SQL:
		return "sql"
	default:
		return ""
	}
}

func mapExecutionProfile(ep string) v1.ExecutionProfile {
	switch ep {
	case "pure":
		return v1.ExecutionProfile_EXECUTION_PROFILE_PURE
	case "file_io":
		return v1.ExecutionProfile_EXECUTION_PROFILE_FILE_IO
	case "http_client":
		return v1.ExecutionProfile_EXECUTION_PROFILE_HTTP_CLIENT
	case "interview_realistic":
		return v1.ExecutionProfile_EXECUTION_PROFILE_INTERVIEW_REALISTIC
	default:
		return v1.ExecutionProfile_EXECUTION_PROFILE_UNSPECIFIED
	}
}

func unmapExecutionProfile(ep v1.ExecutionProfile) string {
	switch ep {
	case v1.ExecutionProfile_EXECUTION_PROFILE_PURE:
		return "pure"
	case v1.ExecutionProfile_EXECUTION_PROFILE_FILE_IO:
		return "file_io"
	case v1.ExecutionProfile_EXECUTION_PROFILE_HTTP_CLIENT:
		return "http_client"
	case v1.ExecutionProfile_EXECUTION_PROFILE_INTERVIEW_REALISTIC:
		return "interview_realistic"
	default:
		return ""
	}
}

func mapRunnerMode(rm string) v1.RunnerMode {
	switch rm {
	case "program":
		return v1.RunnerMode_RUNNER_MODE_PROGRAM
	case "function_io":
		return v1.RunnerMode_RUNNER_MODE_FUNCTION_IO
	default:
		return v1.RunnerMode_RUNNER_MODE_UNSPECIFIED
	}
}

func unmapRunnerMode(rm v1.RunnerMode) string {
	switch rm {
	case v1.RunnerMode_RUNNER_MODE_PROGRAM:
		return "program"
	case v1.RunnerMode_RUNNER_MODE_FUNCTION_IO:
		return "function_io"
	default:
		return ""
	}
}

func mapSubmitFailureKind(kind string) v1.SubmitFailureKind {
	switch kind {
	case "compile_error":
		return v1.SubmitFailureKind_SUBMIT_FAILURE_KIND_COMPILE_ERROR
	case "runtime_error":
		return v1.SubmitFailureKind_SUBMIT_FAILURE_KIND_RUNTIME_ERROR
	case "wrong_answer":
		return v1.SubmitFailureKind_SUBMIT_FAILURE_KIND_WRONG_ANSWER
	case "timeout":
		return v1.SubmitFailureKind_SUBMIT_FAILURE_KIND_TIMEOUT
	default:
		return v1.SubmitFailureKind_SUBMIT_FAILURE_KIND_UNSPECIFIED
	}
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
		PrepType:           mapPrepType(task.PrepType),
		Language:           mapProgrammingLanguage(task.Language),
		CompanyTag:         task.CompanyTag,
		SupportedLanguages: append([]string{}, task.SupportedLanguages...),
		IsExecutable:       task.IsExecutable,
		ExecutionProfile:   mapExecutionProfile(task.ExecutionProfile),
		RunnerMode:         mapRunnerMode(task.RunnerMode),
		DurationSeconds:    task.DurationSeconds,
		StarterCode:        task.StarterCode,
		ReferenceSolution:  task.ReferenceSolution,
		CodeTaskId:         codeTaskID,
		IsActive:           task.IsActive,
		CreatedAt:          timestamppb.New(task.CreatedAt),
		UpdatedAt:          timestamppb.New(task.UpdatedAt),
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
		CreatedAt: timestamppb.New(question.CreatedAt),
		UpdatedAt: timestamppb.New(question.UpdatedAt),
	}
}

func mapQuestionResult(result *model.InterviewPrepQuestionResult) *v1.InterviewPrepQuestionResult {
	if result == nil {
		return nil
	}
	r := &v1.InterviewPrepQuestionResult{
		Id:             result.ID.String(),
		SessionId:      result.SessionID.String(),
		QuestionId:     result.QuestionID.String(),
		SelfAssessment: mapSelfAssessment(result.SelfAssessment),
		AnsweredAt:     timestamppb.New(result.AnsweredAt),
	}
	return r
}

func mapSession(session *model.InterviewPrepSession) *v1.InterviewPrepSession {
	if session == nil {
		return nil
	}
	results := make([]*v1.InterviewPrepQuestionResult, 0, len(session.Results))
	for _, result := range session.Results {
		results = append(results, mapQuestionResult(result))
	}

	s := &v1.InterviewPrepSession{
		Id:                      session.ID.String(),
		UserId:                  session.UserID.String(),
		TaskId:                  session.TaskID.String(),
		Status:                  mapSessionStatus(session.Status),
		CurrentQuestionPosition: session.CurrentQuestionPosition,
		SolveLanguage:           session.SolveLanguage,
		Code:                    session.Code,
		LastSubmissionPassed:    session.LastSubmissionPassed,
		StartedAt:               timestamppb.New(session.StartedAt),
		CreatedAt:               timestamppb.New(session.CreatedAt),
		UpdatedAt:               timestamppb.New(session.UpdatedAt),
		Task:                    mapTask(session.Task),
		CurrentQuestion:         mapQuestion(session.CurrentQuestion),
		Results:                 results,
	}
	if session.FinishedAt != nil {
		s.FinishedAt = timestamppb.New(*session.FinishedAt)
	}
	return s
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
	r := &v1.MockQuestionResult{
		Id:              result.ID.String(),
		StageId:         result.StageID.String(),
		Position:        result.Position,
		QuestionKey:     result.QuestionKey,
		Prompt:          result.Prompt,
		ReferenceAnswer: result.ReferenceAnswer,
		Score:           result.Score,
		Summary:         result.Summary,
		CreatedAt:       timestamppb.New(result.CreatedAt),
		UpdatedAt:       timestamppb.New(result.UpdatedAt),
	}
	if result.AnsweredAt != nil {
		r.AnsweredAt = timestamppb.New(*result.AnsweredAt)
	}
	return r
}

func mapMockStage(stage *model.InterviewPrepMockStage) *v1.MockStage {
	if stage == nil {
		return nil
	}
	questions := make([]*v1.MockQuestionResult, 0, len(stage.QuestionResults))
	for _, question := range stage.QuestionResults {
		questions = append(questions, mapMockQuestionResult(question))
	}

	s := &v1.MockStage{
		Id:                   stage.ID.String(),
		SessionId:            stage.SessionID.String(),
		StageIndex:           stage.StageIndex,
		Kind:                 mapMockStageKind(stage.Kind),
		Status:               mapMockStageStatus(stage.Status),
		TaskId:               stage.TaskID.String(),
		SolveLanguage:        stage.SolveLanguage,
		Code:                 stage.Code,
		LastSubmissionPassed: stage.LastSubmissionPassed,
		ReviewScore:          stage.ReviewScore,
		ReviewSummary:        stage.ReviewSummary,
		StartedAt:            timestamppb.New(stage.StartedAt),
		CreatedAt:            timestamppb.New(stage.CreatedAt),
		UpdatedAt:            timestamppb.New(stage.UpdatedAt),
		Task:                 mapTask(stage.Task),
		QuestionResults:      questions,
		CurrentQuestion:      mapMockQuestionResult(stage.CurrentQuestion),
	}
	if stage.FinishedAt != nil {
		s.FinishedAt = timestamppb.New(*stage.FinishedAt)
	}
	return s
}

func mapMockSession(session *model.InterviewPrepMockSession) *v1.MockSession {
	if session == nil {
		return nil
	}
	stages := make([]*v1.MockStage, 0, len(session.Stages))
	for _, stage := range session.Stages {
		stages = append(stages, mapMockStage(stage))
	}

	s := &v1.MockSession{
		Id:                session.ID.String(),
		UserId:            session.UserID.String(),
		CompanyTag:        session.CompanyTag,
		Status:            mapMockSessionStatus(session.Status),
		CurrentStageIndex: session.CurrentStageIndex,
		StartedAt:         timestamppb.New(session.StartedAt),
		CreatedAt:         timestamppb.New(session.CreatedAt),
		UpdatedAt:         timestamppb.New(session.UpdatedAt),
		Stages:            stages,
		CurrentStage:      mapMockStage(session.CurrentStage),
	}
	if session.FinishedAt != nil {
		s.FinishedAt = timestamppb.New(*session.FinishedAt)
	}
	return s
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
		CreatedAt:       timestamppb.New(item.CreatedAt),
		UpdatedAt:       timestamppb.New(item.UpdatedAt),
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
		CreatedAt:       timestamppb.New(item.CreatedAt),
		UpdatedAt:       timestamppb.New(item.UpdatedAt),
	}
}
