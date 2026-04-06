package interviewprep

import (
	"context"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"api/internal/aireview"
	"api/internal/app/taskjudge"
	"api/internal/model"

	"github.com/google/uuid"
)

type MockSubmitResult struct {
	Passed          bool                              `json:"passed"`
	LastError       string                            `json:"lastError"`
	PassedCount     int32                             `json:"passedCount"`
	TotalCount      int32                             `json:"totalCount"`
	FailedTestIndex int32                             `json:"failedTestIndex"`
	FailureKind     string                            `json:"failureKind"`
	Review          *aireview.InterviewSolutionReview `json:"review,omitempty"`
	Session         *model.InterviewPrepMockSession   `json:"session,omitempty"`
}

type MockQuestionAnswerResult struct {
	Review  *aireview.InterviewAnswerReview `json:"review,omitempty"`
	Session *model.InterviewPrepMockSession `json:"session,omitempty"`
}

type MockSystemDesignReviewResult struct {
	Review  *aireview.SystemDesignReview    `json:"review,omitempty"`
	Session *model.InterviewPrepMockSession `json:"session,omitempty"`
}

type mockQuestionTemplate struct {
	Key    string
	Prompt string
	Answer string
	Always bool
}

var mockStageOrder = []model.InterviewPrepMockStageKind{
	model.InterviewPrepMockStageKindSlices,
	model.InterviewPrepMockStageKindConcurrency,
	model.InterviewPrepMockStageKindSQL,
	model.InterviewPrepMockStageKindArchitecture,
	model.InterviewPrepMockStageKindSystemDesign,
}

func (s *Service) StartMockSession(ctx context.Context, user *model.User, companyTag string) (*model.InterviewPrepMockSession, error) {
	if err := ensureTrusted(user); err != nil {
		return nil, err
	}
	companyTag = strings.TrimSpace(strings.ToLower(companyTag))
	if companyTag == "" {
		return nil, ErrMockCompanyTagRequired
	}

	// Check if user already has an active session for this exact company → resume it
	existing, err := s.repo.GetActiveMockSessionByUserAndCompany(ctx, user.ID, companyTag)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return s.GetMockSession(ctx, user, existing.ID)
	}

	// Block creating a new session if any other active session exists
	anyActive, err := s.repo.GetAnyActiveMockSessionByUser(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if anyActive != nil {
		return nil, ErrAnotherMockSessionActive
	}

	tasks, err := s.ListTasks(ctx, user)
	if err != nil {
		return nil, err
	}
	presets, err := s.repo.ListMockCompanyPresets(ctx)
	if err != nil {
		return nil, err
	}

	selectedTasks, orderedKinds, err := selectMockInterviewTasks(tasks, companyTag, presets)
	if err != nil {
		return nil, err
	}

	nowTime := time.Now().UTC()
	session := &model.InterviewPrepMockSession{
		ID:                uuid.New(),
		UserID:            user.ID,
		CompanyTag:        companyTag,
		Status:            model.InterviewPrepMockSessionStatusActive,
		CurrentStageIndex: 0,
		StartedAt:         nowTime,
		CreatedAt:         nowTime,
		UpdatedAt:         nowTime,
	}

	stages := make([]*model.InterviewPrepMockStage, 0, len(orderedKinds))
	var questionResults []*model.InterviewPrepMockQuestionResult
	for index, kind := range orderedKinds {
		task := selectedTasks[kind]
		stage := &model.InterviewPrepMockStage{
			ID:                   uuid.New(),
			SessionID:            session.ID,
			StageIndex:           int32(index),
			Kind:                 kind,
			Status:               model.InterviewPrepMockStageStatusPending,
			TaskID:               task.ID,
			SolveLanguage:        defaultMockSolveLanguage(task, kind),
			Code:                 defaultMockCode(task, kind),
			LastSubmissionPassed: false,
			ReviewScore:          0,
			ReviewSummary:        "",
			StartedAt:            nowTime,
			CreatedAt:            nowTime,
			UpdatedAt:            nowTime,
		}
		if index == 0 {
			stage.Status = model.InterviewPrepMockStageStatusSolving
		}
		stageQuestions, questionsErr := s.buildMockStageQuestions(ctx, session.CompanyTag, task, stage)
		if questionsErr != nil {
			return nil, questionsErr
		}
		questionResults = append(questionResults, stageQuestions...)
		stages = append(stages, stage)
	}

	if err := s.repo.CreateMockSession(ctx, session, stages, questionResults); err != nil {
		return nil, err
	}
	return s.GetMockSession(ctx, user, session.ID)
}

func (s *Service) GetMockSession(ctx context.Context, user *model.User, sessionID uuid.UUID) (*model.InterviewPrepMockSession, error) {
	if err := ensureTrusted(user); err != nil {
		return nil, err
	}
	session, err := s.repo.GetMockSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if session == nil || session.UserID != user.ID {
		return nil, ErrMockSessionNotFound
	}
	for _, stage := range session.Stages {
		task, taskErr := s.repo.GetTask(ctx, stage.TaskID)
		if taskErr != nil {
			return nil, taskErr
		}
		stage.Task = task
		if stage.Status == model.InterviewPrepMockStageStatusQuestions {
			for _, question := range stage.QuestionResults {
				if question.AnsweredAt == nil {
					stage.CurrentQuestion = question
					break
				}
			}
		}
		if stage.StageIndex == session.CurrentStageIndex {
			session.CurrentStage = stage
		}
	}
	return session, nil
}

func (s *Service) SubmitMockStage(
	ctx context.Context,
	user *model.User,
	sessionID uuid.UUID,
	code string,
	solveLanguage string,
	notes string,
) (*MockSubmitResult, error) {
	session, stage, err := s.getCurrentMockStage(ctx, user, sessionID)
	if err != nil {
		return nil, err
	}
	if stage.Status != model.InterviewPrepMockStageStatusSolving {
		return nil, ErrMockStageSubmitNotAllowed
	}
	if stage.Kind == model.InterviewPrepMockStageKindSystemDesign {
		return nil, ErrMockStageSubmitNotAllowed
	}
	if stage.Task == nil {
		return nil, ErrTaskNotFound
	}

	solveLanguage = normalizeSolveLanguage(firstNonEmptyLanguage(solveLanguage, stage.SolveLanguage, stage.Task.Language))

	if stage.Task.IsExecutable {
		if stage.Task.CodeTaskID == nil {
			return nil, ErrExecutableTaskNotConfigured
		}
		codeTask, err := s.repo.GetCodeTask(ctx, *stage.Task.CodeTaskID)
		if err != nil {
			return nil, err
		}
		judgeResult, err := taskjudge.EvaluateCodeTask(ctx, s.sandbox, codeTask, code, solveLanguage)
		if err != nil {
			return nil, err
		}
		nextStatus := model.InterviewPrepMockStageStatusSolving
		if judgeResult.Passed {
			nextStatus = nextMockStageStatus(stage)
		}
		if err := s.repo.UpdateMockStageSubmission(ctx, stage.ID, solveLanguage, code, judgeResult.Passed, 0, "", nextStatus); err != nil {
			return nil, err
		}
		if judgeResult.Passed {
			if err := s.advanceMockSessionIfStageReady(ctx, session, stage); err != nil {
				return nil, err
			}
		}
		nextSession, err := s.GetMockSession(ctx, user, session.ID)
		if err != nil {
			return nil, err
		}
		return &MockSubmitResult{
			Passed:          judgeResult.Passed,
			LastError:       judgeResult.LastError,
			PassedCount:     judgeResult.PassedCount,
			TotalCount:      judgeResult.TotalCount,
			FailedTestIndex: judgeResult.FailedTestIndex,
			FailureKind:     judgeResult.FailureKind.String(),
			Session:         nextSession,
		}, nil
	}

	review, err := s.reviewer.ReviewInterviewSolution(ctx, aireview.InterviewSolutionReviewRequest{
		ModelOverride:     s.modelOverrideForStage(ctx, session.CompanyTag, stage),
		StageKind:         stage.Kind.String(),
		TaskTitle:         stage.Task.Title,
		Statement:         stage.Task.Statement,
		ReferenceSolution: stage.Task.ReferenceSolution,
		CandidateLanguage: solveLanguage,
		CandidateCode:     code,
		CandidateNotes:    notes,
	})
	if err != nil {
		return nil, err
	}
	if err := s.repo.UpdateMockStageSubmission(ctx, stage.ID, solveLanguage, code, true, int32(review.Score), review.Summary, nextMockStageStatus(stage)); err != nil {
		return nil, err
	}
	if err := s.advanceMockSessionIfStageReady(ctx, session, stage); err != nil {
		return nil, err
	}
	nextSession, err := s.GetMockSession(ctx, user, session.ID)
	if err != nil {
		return nil, err
	}
	return &MockSubmitResult{
		Passed:  true,
		Review:  review,
		Session: nextSession,
	}, nil
}

func (s *Service) ReviewMockSystemDesign(
	ctx context.Context,
	user *model.User,
	sessionID uuid.UUID,
	fileName string,
	contentType string,
	imageBytes []byte,
	input SystemDesignReviewInput,
) (*MockSystemDesignReviewResult, error) {
	session, stage, err := s.getCurrentMockStage(ctx, user, sessionID)
	if err != nil {
		return nil, err
	}
	if stage.Status != model.InterviewPrepMockStageStatusSolving || stage.Kind != model.InterviewPrepMockStageKindSystemDesign {
		return nil, ErrMockStageSubmitNotAllowed
	}
	if stage.Task == nil {
		return nil, ErrTaskNotFound
	}

	review, err := s.reviewer.ReviewSystemDesign(ctx, aireview.SystemDesignReviewRequest{
		ModelOverride:  s.modelOverrideForStage(ctx, session.CompanyTag, stage),
		TaskTitle:      stage.Task.Title,
		Statement:      stage.Task.Statement,
		Notes:          input.Notes,
		Components:     input.Components,
		APIs:           input.APIs,
		DatabaseSchema: input.DatabaseSchema,
		Traffic:        input.Traffic,
		Reliability:    input.Reliability,
		ImageBytes:     imageBytes,
		ImageMIME:      contentType,
		ImageName:      fileName,
	})
	if err != nil {
		return nil, err
	}

	if err := s.repo.UpdateMockStageSubmission(ctx, stage.ID, "", "", true, int32(review.Score), review.Summary, nextMockStageStatus(stage)); err != nil {
		return nil, err
	}
	if err := s.advanceMockSessionIfStageReady(ctx, session, stage); err != nil {
		return nil, err
	}

	nextSession, err := s.GetMockSession(ctx, user, session.ID)
	if err != nil {
		return nil, err
	}
	return &MockSystemDesignReviewResult{
		Review:  review,
		Session: nextSession,
	}, nil
}

func (s *Service) AnswerMockQuestion(ctx context.Context, user *model.User, sessionID uuid.UUID, answer string) (*MockQuestionAnswerResult, error) {
	session, stage, err := s.getCurrentMockStage(ctx, user, sessionID)
	if err != nil {
		return nil, err
	}
	if stage.Status != model.InterviewPrepMockStageStatusQuestions || stage.CurrentQuestion == nil {
		return nil, ErrMockQuestionNotReady
	}
	if strings.TrimSpace(answer) == "" {
		return nil, ErrMockQuestionAnswerRequired
	}

	review, err := s.reviewer.ReviewInterviewAnswer(ctx, aireview.InterviewAnswerReviewRequest{
		ModelOverride:   s.modelOverrideForFollowup(ctx, session.CompanyTag, stage),
		Topic:           stage.Kind.String(),
		TaskTitle:       stage.Task.Title,
		QuestionPrompt:  stage.CurrentQuestion.Prompt,
		ReferenceAnswer: stage.CurrentQuestion.ReferenceAnswer,
		CandidateAnswer: answer,
	})
	if err != nil {
		return nil, err
	}

	nowTime := time.Now().UTC()
	if err := s.repo.CompleteMockQuestion(ctx, stage.CurrentQuestion.ID, int32(review.Score), review.Summary, nowTime); err != nil {
		return nil, err
	}

	updatedSession, err := s.GetMockSession(ctx, user, session.ID)
	if err != nil {
		return nil, err
	}
	if updatedSession.CurrentStage != nil && updatedSession.CurrentStage.CurrentQuestion == nil {
		if err := s.completeAndAdvanceMockStage(ctx, updatedSession, updatedSession.CurrentStage); err != nil {
			return nil, err
		}
		updatedSession, err = s.GetMockSession(ctx, user, session.ID)
		if err != nil {
			return nil, err
		}
	}
	return &MockQuestionAnswerResult{
		Review:  review,
		Session: updatedSession,
	}, nil
}

func (s *Service) buildMockStageQuestions(ctx context.Context, companyTag string, task *model.InterviewPrepTask, stage *model.InterviewPrepMockStage) ([]*model.InterviewPrepMockQuestionResult, error) {
	taskQuestions, err := s.repo.ListQuestionsByTask(ctx, task.ID)
	if err != nil {
		return nil, err
	}
	poolItems, err := s.repo.ListMockQuestionPools(ctx)
	if err != nil {
		return nil, err
	}
	templates, err := stageQuestionsForTask(stage.Kind, companyTag, task, taskQuestions, poolItems)
	if err != nil {
		return nil, err
	}
	nowTime := time.Now().UTC()
	results := make([]*model.InterviewPrepMockQuestionResult, 0, len(templates))
	for index, template := range templates {
		results = append(results, &model.InterviewPrepMockQuestionResult{
			ID:              uuid.New(),
			StageID:         stage.ID,
			Position:        int32(index + 1),
			QuestionKey:     template.Key,
			Prompt:          template.Prompt,
			ReferenceAnswer: template.Answer,
			Score:           0,
			Summary:         "",
			CreatedAt:       nowTime,
			UpdatedAt:       nowTime,
		})
	}
	return results, nil
}

func (s *Service) getCurrentMockStage(ctx context.Context, user *model.User, sessionID uuid.UUID) (*model.InterviewPrepMockSession, *model.InterviewPrepMockStage, error) {
	session, err := s.GetMockSession(ctx, user, sessionID)
	if err != nil {
		return nil, nil, err
	}
	if session.Status == model.InterviewPrepMockSessionStatusFinished {
		return nil, nil, ErrMockSessionFinished
	}
	if session.CurrentStage == nil {
		return nil, nil, ErrMockSessionNotFound
	}
	return session, session.CurrentStage, nil
}

func (s *Service) advanceMockSessionIfStageReady(ctx context.Context, session *model.InterviewPrepMockSession, stage *model.InterviewPrepMockStage) error {
	if len(stage.QuestionResults) == 0 {
		return s.completeAndAdvanceMockStage(ctx, session, stage)
	}
	return nil
}

func (s *Service) completeAndAdvanceMockStage(ctx context.Context, session *model.InterviewPrepMockSession, stage *model.InterviewPrepMockStage) error {
	if err := s.repo.CompleteMockStage(ctx, stage.ID); err != nil {
		return err
	}

	nextIndex := stage.StageIndex + 1
	if int(nextIndex) >= len(session.Stages) {
		return s.repo.FinishMockSession(ctx, session.ID)
	}
	if err := s.repo.SetMockStageStatus(ctx, session.Stages[nextIndex].ID, model.InterviewPrepMockStageStatusSolving); err != nil {
		return err
	}
	return s.repo.AdvanceMockSession(ctx, session.ID, nextIndex)
}

func nextMockStageStatus(stage *model.InterviewPrepMockStage) model.InterviewPrepMockStageStatus {
	if len(stage.QuestionResults) == 0 {
		return model.InterviewPrepMockStageStatusCompleted
	}
	return model.InterviewPrepMockStageStatusQuestions
}

func selectMockInterviewTasks(tasks []*model.InterviewPrepTask, companyTag string, presets []*model.InterviewPrepMockCompanyPreset) (map[model.InterviewPrepMockStageKind]*model.InterviewPrepTask, []model.InterviewPrepMockStageKind, error) {
	filtered := make([]*model.InterviewPrepTask, 0)
	for _, task := range tasks {
		if task == nil || !task.IsActive {
			continue
		}
		if strings.TrimSpace(strings.ToLower(task.CompanyTag)) != companyTag {
			continue
		}
		filtered = append(filtered, task)
	}

	activePresets := companyPresetsForCompany(companyTag, presets)
	orderedKinds := mockStageOrder
	if len(activePresets) > 0 {
		orderedKinds = make([]model.InterviewPrepMockStageKind, 0, len(activePresets))
		for _, preset := range activePresets {
			orderedKinds = append(orderedKinds, preset.StageKind)
		}
	}

	result := make(map[model.InterviewPrepMockStageKind]*model.InterviewPrepTask, len(orderedKinds))
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	for _, kind := range orderedKinds {
		candidates := mockStageCandidates(kind, filtered)
		if preset := findCompanyPreset(kind, activePresets); preset != nil && strings.TrimSpace(preset.TaskSlugPattern) != "" {
			presetCandidates := make([]*model.InterviewPrepTask, 0)
			pattern := strings.ToLower(strings.TrimSpace(preset.TaskSlugPattern))
			for _, task := range candidates {
				if strings.Contains(strings.ToLower(task.Slug), pattern) {
					presetCandidates = append(presetCandidates, task)
				}
			}
			if len(presetCandidates) > 0 {
				candidates = presetCandidates
			}
		}
		if len(candidates) == 0 {
			return nil, nil, ErrMockTaskPoolIncomplete
		}
		result[kind] = candidates[rng.Intn(len(candidates))]
	}
	return result, orderedKinds, nil
}

func mockStageCandidates(kind model.InterviewPrepMockStageKind, tasks []*model.InterviewPrepTask) []*model.InterviewPrepTask {
	result := make([]*model.InterviewPrepTask, 0)
	for _, task := range tasks {
		if task == nil {
			continue
		}
		switch kind {
		case model.InterviewPrepMockStageKindSlices:
			if task.IsExecutable && strings.Contains(task.Slug, "slice") {
				result = append(result, task)
			}
		case model.InterviewPrepMockStageKindConcurrency:
			if task.IsExecutable && (strings.Contains(task.Slug, "worker") || strings.Contains(task.Slug, "mutex") || strings.Contains(task.Slug, "concurr")) {
				result = append(result, task)
			}
		case model.InterviewPrepMockStageKindSQL:
			if task.IsExecutable && normalizeSolveLanguage(task.Language) == "sql" {
				result = append(result, task)
			}
		case model.InterviewPrepMockStageKindArchitecture:
			if !task.IsExecutable && task.PrepType == model.InterviewPrepTypeCoding && normalizeSolveLanguage(task.Language) == "go" {
				result = append(result, task)
			}
		case model.InterviewPrepMockStageKindSystemDesign:
			if task.PrepType == model.InterviewPrepTypeSystemDesign {
				result = append(result, task)
			}
		}
	}
	return result
}

func defaultMockSolveLanguage(task *model.InterviewPrepTask, kind model.InterviewPrepMockStageKind) string {
	if kind == model.InterviewPrepMockStageKindSystemDesign {
		return ""
	}
	if len(task.SupportedLanguages) > 0 {
		return normalizeSolveLanguage(task.SupportedLanguages[0])
	}
	return normalizeSolveLanguage(task.Language)
}

func defaultMockCode(task *model.InterviewPrepTask, kind model.InterviewPrepMockStageKind) string {
	if kind == model.InterviewPrepMockStageKindSystemDesign {
		return ""
	}
	return starterForMockTask(task, defaultMockSolveLanguage(task, kind))
}

func starterForMockTask(task *model.InterviewPrepTask, solveLanguage string) string {
	if task == nil {
		return ""
	}
	if task.RunnerMode == "function_io" {
		switch solveLanguage {
		case "go":
			return extractGoSolveStarter(task.StarterCode)
		case "python":
			return extractPythonSolveStarter(task.StarterCode)
		}
	}
	if trimmed := strings.TrimSpace(task.StarterCode); trimmed != "" {
		return task.StarterCode
	}
	switch solveLanguage {
	case "go":
		return "package main\n\nfunc solve(input string) string {\n\treturn \"\"\n}\n"
	case "python":
		return "def solve(input: str) -> str:\n    return \"\"\n"
	case "sql":
		return "-- Write SQL here\nSELECT 1;\n"
	default:
		return ""
	}
}

func extractGoSolveStarter(code string) string {
	trimmed := strings.TrimSpace(code)
	if trimmed == "" {
		return "func solve(input string) string {\n\treturn \"\"\n}\n"
	}
	index := strings.Index(trimmed, "func solve(")
	if index < 0 {
		return "func solve(input string) string {\n\treturn \"\"\n}\n"
	}
	snippet := strings.TrimSpace(trimmed[index:])
	if mainIndex := strings.Index(snippet, "\nfunc main("); mainIndex >= 0 {
		snippet = strings.TrimSpace(snippet[:mainIndex])
	}
	if !strings.HasSuffix(snippet, "\n") {
		snippet += "\n"
	}
	return snippet
}

func extractPythonSolveStarter(code string) string {
	trimmed := strings.TrimSpace(code)
	if trimmed == "" {
		return "def solve(input: str) -> str:\n    return \"\"\n"
	}
	index := strings.Index(trimmed, "def solve(")
	if index < 0 {
		return "def solve(input: str) -> str:\n    return \"\"\n"
	}
	snippet := strings.TrimSpace(trimmed[index:])
	if !strings.HasSuffix(snippet, "\n") {
		snippet += "\n"
	}
	return snippet
}

func stageQuestionsForTask(kind model.InterviewPrepMockStageKind, companyTag string, task *model.InterviewPrepTask, taskQuestions []*model.InterviewPrepQuestion, poolItems []*model.InterviewPrepMockQuestionPoolItem) ([]mockQuestionTemplate, error) {
	items := genericMockQuestions(kind, companyTag, poolItems)
	if len(items) > 0 {
		return items, nil
	}

	items = taskSpecificMockQuestions(task, taskQuestions)
	if len(items) == 0 {
		return nil, ErrMockQuestionPoolIncomplete
	}
	return items, nil
}

func (s *Service) modelOverrideForStage(ctx context.Context, companyTag string, stage *model.InterviewPrepMockStage) string {
	if stage == nil {
		return ""
	}
	if presets, err := s.repo.ListMockCompanyPresets(ctx); err == nil {
		if preset := findCompanyPreset(stage.Kind, companyPresetsForCompany(companyTag, presets)); preset != nil && strings.TrimSpace(preset.AIModelOverride) != "" {
			return strings.TrimSpace(preset.AIModelOverride)
		}
	}
	switch stage.Kind {
	case model.InterviewPrepMockStageKindSystemDesign:
		return s.modelSystemDesign
	case model.InterviewPrepMockStageKindArchitecture:
		return s.modelArchitecture
	default:
		return s.modelCode
	}
}

func (s *Service) modelOverrideForFollowup(ctx context.Context, companyTag string, stage *model.InterviewPrepMockStage) string {
	if stage == nil {
		return s.modelFollowup
	}
	if s.modelFollowup != "" {
		return s.modelFollowup
	}
	return s.modelOverrideForStage(ctx, companyTag, stage)
}

func genericMockQuestions(kind model.InterviewPrepMockStageKind, companyTag string, poolItems []*model.InterviewPrepMockQuestionPoolItem) []mockQuestionTemplate {
	topic := kind.String()
	normalizedCompanyTag := strings.TrimSpace(strings.ToLower(companyTag))
	matched := make([]mockQuestionTemplate, 0)
	for _, item := range poolItems {
		if item == nil || !item.IsActive {
			continue
		}
		if strings.TrimSpace(strings.ToLower(item.Topic)) != topic {
			continue
		}
		if tag := strings.TrimSpace(strings.ToLower(item.CompanyTag)); tag != "" && tag != normalizedCompanyTag {
			continue
		}
		matched = append(matched, mockQuestionTemplate{
			Key:    item.QuestionKey,
			Prompt: item.Prompt,
			Answer: item.ReferenceAnswer,
			Always: item.AlwaysAsk,
		})
	}
	if len(matched) == 0 {
		return nil
	}
	return fallbackSelection(matched)
}

func fallbackSelection(pool []mockQuestionTemplate) []mockQuestionTemplate {
	if len(pool) <= 1 {
		return pool
	}
	always := make([]mockQuestionTemplate, 0, len(pool))
	optional := make([]mockQuestionTemplate, 0, len(pool))
	for _, item := range pool {
		if item.Always {
			always = append(always, item)
		} else {
			optional = append(optional, item)
		}
	}
	if len(optional) > 0 {
		rng := rand.New(rand.NewSource(time.Now().UnixNano()))
		always = append(always, optional[rng.Intn(len(optional))])
	}
	return always
}

func taskSpecificMockQuestions(task *model.InterviewPrepTask, taskQuestions []*model.InterviewPrepQuestion) []mockQuestionTemplate {
	if task == nil {
		return nil
	}
	if len(taskQuestions) > 0 {
		templates := make([]mockQuestionTemplate, 0, len(taskQuestions))
		for index, question := range taskQuestions {
			templates = append(templates, mockQuestionTemplate{
				Key:    fmt.Sprintf("%s-q-%d", task.Slug, index+1),
				Prompt: question.Prompt,
				Answer: question.Answer,
				Always: index == 0,
			})
		}
		if len(templates) > 2 {
			return append([]mockQuestionTemplate{templates[0]}, templates[1+rand.New(rand.NewSource(time.Now().UnixNano())).Intn(len(templates)-1)])
		}
		return templates
	}
	templates := make([]mockQuestionTemplate, 0)
	// Reference solution is used as first anchor question for architecture/system design.
	if value := strings.TrimSpace(task.ReferenceSolution); value != "" {
		templates = append(templates, mockQuestionTemplate{
			Key:    task.Slug + "-tradeoffs",
			Prompt: "Какие главные trade-off и слабые места есть у твоего решения?",
			Answer: value,
			Always: true,
		})
	}
	return templates
}

func companyPresetsForCompany(companyTag string, presets []*model.InterviewPrepMockCompanyPreset) []*model.InterviewPrepMockCompanyPreset {
	items := make([]*model.InterviewPrepMockCompanyPreset, 0)
	for _, preset := range presets {
		if preset == nil || !preset.IsActive {
			continue
		}
		if strings.TrimSpace(strings.ToLower(preset.CompanyTag)) != companyTag {
			continue
		}
		items = append(items, preset)
	}
	return items
}

func findCompanyPreset(kind model.InterviewPrepMockStageKind, presets []*model.InterviewPrepMockCompanyPreset) *model.InterviewPrepMockCompanyPreset {
	for _, preset := range presets {
		if preset == nil || !preset.IsActive {
			continue
		}
		if preset.StageKind == kind {
			return preset
		}
	}
	return nil
}
