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
}

func (s *Service) StartMockSession(ctx context.Context, user *model.User, companyTag string, programSlug string) (*model.InterviewPrepMockSession, error) {
	if err := ensureTrusted(user); err != nil {
		return nil, err
	}

	normalizedCompany := strings.TrimSpace(strings.ToLower(companyTag))
	normalizedProgram := strings.TrimSpace(strings.ToLower(programSlug))
	resumeKey := firstNonEmptyLanguage(normalizedProgram, normalizedCompany)
	if resumeKey == "" {
		resumeKey = "gma_general_swe_mid"
	}

	existing, err := s.repo.GetActiveMockSessionByUserAndCompany(ctx, user.ID, resumeKey)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return s.GetMockSession(ctx, user, existing.ID)
	}

	anyActive, err := s.repo.GetAnyActiveMockSessionByUser(ctx, user.ID)
	if err != nil {
		return nil, err
	}
	if anyActive != nil {
		return nil, ErrAnotherMockSessionActive
	}

	blueprint, err := s.repo.ResolveMockBlueprint(ctx, normalizedCompany, normalizedProgram)
	if err != nil {
		return nil, err
	}
	if blueprint == nil {
		return nil, ErrMockTaskPoolIncomplete
	}
	effectiveCompanyTag := normalizedCompany
	if effectiveCompanyTag == "" {
		effectiveCompanyTag = strings.TrimSpace(strings.ToLower(blueprint.PrimaryAliasSlug))
	}

	rounds, err := s.repo.ListBlueprintRounds(ctx, blueprint.ID)
	if err != nil {
		return nil, err
	}
	if len(rounds) == 0 {
		return nil, ErrMockTaskPoolIncomplete
	}

	nowTime := time.Now().UTC()
	session := &model.InterviewPrepMockSession{
		ID:                uuid.New(),
		UserID:            user.ID,
		CompanyTag:        effectiveCompanyTag,
		BlueprintSlug:     blueprint.Slug,
		BlueprintTitle:    blueprint.Title,
		TrackSlug:         blueprint.TrackSlug,
		IntroText:         blueprint.IntroText,
		ClosingText:       blueprint.ClosingText,
		Status:            model.InterviewPrepMockSessionStatusActive,
		CurrentStageIndex: 0,
		StartedAt:         nowTime,
		CreatedAt:         nowTime,
		UpdatedAt:         nowTime,
	}

	stages := make([]*model.InterviewPrepMockStage, 0, len(rounds))
	questionResults := make([]*model.InterviewPrepMockQuestionResult, 0, len(rounds)*2)
	for index, round := range rounds {
		task, poolID, taskErr := s.repo.SelectTaskForBlueprintRound(ctx, round, effectiveCompanyTag)
		if taskErr != nil {
			return nil, taskErr
		}
		if task == nil {
			return nil, ErrMockTaskPoolIncomplete
		}

		stageKind := model.InterviewPrepMockStageKindFromRoundType(round.RoundType)
		stage := &model.InterviewPrepMockStage{
			ID:                      uuid.New(),
			SessionID:               session.ID,
			StageIndex:              int32(index),
			Kind:                    stageKind,
			RoundType:               round.RoundType,
			Title:                   round.Title,
			Status:                  model.InterviewPrepMockStageStatusPending,
			TaskID:                  task.ID,
			BlueprintRoundID:        &round.ID,
			SourcePoolID:            poolID,
			SolveLanguage:           defaultMockSolveLanguage(task, stageKind),
			Code:                    defaultMockCode(task, stageKind),
			DurationSeconds:         round.DurationSeconds,
			EvaluatorMode:           round.EvaluatorMode,
			CandidateInstructions:   round.CandidateInstructionsOverride,
			InterviewerInstructions: round.InterviewerInstructionsOverride,
			LastSubmissionPassed:    false,
			ReviewScore:             0,
			ReviewSummary:           "",
			StartedAt:               nowTime,
			CreatedAt:               nowTime,
			UpdatedAt:               nowTime,
			Task:                    task,
		}
		if index == 0 {
			stage.Status = model.InterviewPrepMockStageStatusSolving
		}

		stageQuestions, questionsErr := s.buildMockStageQuestions(ctx, task, stage, round.MaxFollowupCount)
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
		if codeTask == nil {
			return nil, ErrExecutableTaskNotConfigured
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

	if s.reviewer == nil {
		return nil, aireview.ErrNotConfigured
	}
	review, err := s.reviewer.ReviewInterviewSolution(ctx, aireview.InterviewSolutionReviewRequest{
		ModelOverride:     s.modelOverrideForStage(stage),
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
	normalizedType := ""
	if len(imageBytes) > 0 {
		if int64(len(imageBytes)) > s.maxImageBytes {
			return nil, ErrReviewImageTooLarge
		}
		normalizedType, err = normalizeReviewImageType(contentType, fileName)
		if err != nil {
			return nil, err
		}
	}

	review, err := s.reviewer.ReviewSystemDesign(ctx, aireview.SystemDesignReviewRequest{
		ModelOverride:  s.modelOverrideForStage(stage),
		TaskTitle:      stage.Task.Title,
		Statement:      stage.Task.Statement,
		Notes:          input.Notes,
		Components:     input.Components,
		APIs:           input.APIs,
		DatabaseSchema: input.DatabaseSchema,
		Traffic:        input.Traffic,
		Reliability:    input.Reliability,
		ImageBytes:     imageBytes,
		ImageMIME:      normalizedType,
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

	if s.reviewer == nil {
		return nil, aireview.ErrNotConfigured
	}
	if stage.Task == nil {
		return nil, ErrTaskNotFound
	}
	review, err := s.reviewer.ReviewInterviewAnswer(ctx, aireview.InterviewAnswerReviewRequest{
		ModelOverride:   s.modelOverrideForFollowup(stage),
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

func (s *Service) buildMockStageQuestions(
	ctx context.Context,
	task *model.InterviewPrepTask,
	stage *model.InterviewPrepMockStage,
	maxFollowupCount int32,
) ([]*model.InterviewPrepMockQuestionResult, error) {
	taskQuestions, err := s.repo.ListQuestionsByTask(ctx, task.ID)
	if err != nil {
		return nil, err
	}
	templates, err := taskSpecificMockQuestions(task, stage, taskQuestions, maxFollowupCount)
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

func defaultMockSolveLanguage(task *model.InterviewPrepTask, kind model.InterviewPrepMockStageKind) string {
	if task == nil {
		return ""
	}
	if kind == model.InterviewPrepMockStageKindSystemDesign || task.PrepType == model.InterviewPrepTypeBehavioral {
		return ""
	}
	if len(task.SupportedLanguages) > 0 {
		return normalizeSolveLanguage(task.SupportedLanguages[0])
	}
	return normalizeSolveLanguage(task.Language)
}

func defaultMockCode(task *model.InterviewPrepTask, kind model.InterviewPrepMockStageKind) string {
	if task == nil {
		return ""
	}
	if kind == model.InterviewPrepMockStageKindSystemDesign || task.PrepType == model.InterviewPrepTypeBehavioral {
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

func (s *Service) modelOverrideForStage(stage *model.InterviewPrepMockStage) string {
	if stage == nil {
		return ""
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

func (s *Service) modelOverrideForFollowup(stage *model.InterviewPrepMockStage) string {
	if stage == nil {
		return s.modelFollowup
	}
	if s.modelFollowup != "" {
		return s.modelFollowup
	}
	return s.modelOverrideForStage(stage)
}

func taskSpecificMockQuestions(task *model.InterviewPrepTask, stage *model.InterviewPrepMockStage, taskQuestions []*model.InterviewPrepQuestion, maxCount int32) ([]mockQuestionTemplate, error) {
	if task == nil {
		return nil, ErrMockQuestionPoolIncomplete
	}
	if len(taskQuestions) > 0 {
		templates := make([]mockQuestionTemplate, 0, len(taskQuestions))
		for index, question := range taskQuestions {
			templates = append(templates, mockQuestionTemplate{
				Key:    fmt.Sprintf("%s-q-%d", task.Slug, index+1),
				Prompt: question.Prompt,
				Answer: question.Answer,
			})
		}
		return selectQuestionTemplates(templates, maxCount), nil
	}
	templates := defaultMockQuestionTemplates(task, stage)
	if len(templates) > 0 {
		return selectQuestionTemplates(templates, maxCount), nil
	}
	return nil, ErrMockQuestionPoolIncomplete
}

func selectQuestionTemplates(items []mockQuestionTemplate, maxCount int32) []mockQuestionTemplate {
	if len(items) == 0 {
		return nil
	}
	limit := int(maxCount)
	if limit <= 0 || limit >= len(items) {
		return items
	}
	selected := []mockQuestionTemplate{items[0]}
	if limit == 1 {
		return selected
	}
	remaining := append([]mockQuestionTemplate{}, items[1:]...)
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	for len(selected) < limit && len(remaining) > 0 {
		index := rng.Intn(len(remaining))
		selected = append(selected, remaining[index])
		remaining = append(remaining[:index], remaining[index+1:]...)
	}
	return selected
}

func defaultMockQuestionTemplates(task *model.InterviewPrepTask, stage *model.InterviewPrepMockStage) []mockQuestionTemplate {
	if task == nil {
		return nil
	}
	reference := strings.TrimSpace(task.ReferenceSolution)
	roundType := ""
	if stage != nil {
		roundType = stage.RoundType
	}

	switch roundType {
	case "coding_algorithmic":
		return []mockQuestionTemplate{
			{
				Key:    task.Slug + "-complexity",
				Prompt: "Почему выбрана именно такая асимптотика и в каких входах решение станет узким местом?",
				Answer: reference,
			},
			{
				Key:    task.Slug + "-edges",
				Prompt: "Какие edge cases ты бы проверил в первую очередь и как бы убедился, что решение не ломается на них?",
				Answer: reference,
			},
			{
				Key:    task.Slug + "-alternatives",
				Prompt: "Какое альтернативное решение ты рассматривал и почему отказался от него?",
				Answer: reference,
			},
		}
	case "coding_practical":
		return []mockQuestionTemplate{
			{
				Key:    task.Slug + "-tradeoffs",
				Prompt: "Какие главные trade-off и слабые места есть у твоего решения?",
				Answer: reference,
			},
			{
				Key:    task.Slug + "-failures",
				Prompt: "Где это решение сломается в проде первым и как бы ты усилил надежность без полного переписывания?",
				Answer: reference,
			},
			{
				Key:    task.Slug + "-testing",
				Prompt: "Какие два-три теста ты бы считал обязательными перед релизом и почему именно их?",
				Answer: reference,
			},
		}
	case "sql":
		return []mockQuestionTemplate{
			{
				Key:    task.Slug + "-indexes",
				Prompt: "Какие индексы здесь нужны и чем ты обоснуешь их выбор?",
				Answer: reference,
			},
			{
				Key:    task.Slug + "-cardinality",
				Prompt: "Какой join или фильтр здесь будет самым дорогим на больших объемах данных и почему?",
				Answer: reference,
			},
			{
				Key:    task.Slug + "-validation",
				Prompt: "Как бы ты проверил корректность запроса на реальных данных, если execution plan вызывает сомнения?",
				Answer: reference,
			},
		}
	case "system_design":
		return []mockQuestionTemplate{
			{
				Key:    task.Slug + "-bottleneck",
				Prompt: "Какой bottleneck в этой архитектуре появится первым при росте трафика и как ты его снимешь?",
				Answer: reference,
			},
			{
				Key:    task.Slug + "-consistency",
				Prompt: "Где ты выбрал бы weaker consistency, а где нет, и почему?",
				Answer: reference,
			},
			{
				Key:    task.Slug + "-reliability",
				Prompt: "Как бы ты спроектировал деградацию сервиса при partial outage, чтобы продукт оставался usable?",
				Answer: reference,
			},
		}
	case "behavioral":
		return []mockQuestionTemplate{
			{
				Key:    task.Slug + "-ownership",
				Prompt: "Что в этой ситуации было лично твоим ownership, а что зависело от команды или контекста?",
				Answer: reference,
			},
			{
				Key:    task.Slug + "-outcome",
				Prompt: "По каким сигналам ты понял, что решение было успешным или неуспешным?",
				Answer: reference,
			},
			{
				Key:    task.Slug + "-retrospective",
				Prompt: "Что бы ты сделал иначе сейчас, если бы заново проходил через ту же ситуацию?",
				Answer: reference,
			},
		}
	case "code_review":
		return []mockQuestionTemplate{
			{
				Key:    task.Slug + "-bugs",
				Prompt: "Какой риск correctness или data loss ты бы искал в этом коде первым?",
				Answer: reference,
			},
			{
				Key:    task.Slug + "-maintainability",
				Prompt: "Где здесь основная maintainability debt и как бы ты снимал ее поэтапно?",
				Answer: reference,
			},
		}
	default:
		if reference == "" {
			return nil
		}
		return []mockQuestionTemplate{{
			Key:    task.Slug + "-tradeoffs",
			Prompt: "Какие главные trade-off и слабые места есть у твоего решения?",
			Answer: reference,
		}}
	}
}
