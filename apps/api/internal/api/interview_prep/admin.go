package interview_prep

import (
	"context"
	"regexp"
	"strings"
	"time"

	"api/internal/model"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/interview_prep/v1"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) ListAdminTasks(ctx context.Context, req *v1.ListAdminTasksRequest) (*v1.ListAdminTasksResponse, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	tasks, err := i.admin.ListTasksFiltered(ctx, req.GetCompanyTag(), req.GetPrepType(), req.GetSearch(), req.GetIncludeInactive())
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	items := make([]*v1.InterviewPrepTask, 0, len(tasks))
	for _, task := range tasks {
		items = append(items, mapTask(task))
	}
	return &v1.ListAdminTasksResponse{Tasks: items}, nil
}

// BulkCreateAdminTasks iterates payloads, creating each one
// independently. A single bad row doesn't abort the batch — callers
// get a per-row result so the admin UI can show green/red ticks.
func (i *Implementation) BulkCreateAdminTasks(ctx context.Context, req *v1.BulkCreateAdminTasksRequest) (*v1.BulkCreateAdminTasksResponse, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	results := make([]*v1.BulkCreateResult, 0, len(req.GetTasks()))
	var created, failed int32
	for _, payload := range req.GetTasks() {
		slug := ""
		if payload != nil {
			slug = payload.Slug
		}
		task, err := buildTask(payload, uuid.New())
		if err != nil {
			failed++
			results = append(results, &v1.BulkCreateResult{
				Slug:      slug,
				ErrorCode: "VALIDATION",
				ErrorMsg:  err.Error(),
			})
			continue
		}
		now := time.Now().UTC()
		task.CreatedAt = now
		task.UpdatedAt = now
		if err := i.admin.CreateTask(ctx, task); err != nil {
			failed++
			results = append(results, &v1.BulkCreateResult{
				Slug:      task.Slug,
				ErrorCode: "INSERT",
				ErrorMsg:  err.Error(),
			})
			continue
		}
		created++
		results = append(results, &v1.BulkCreateResult{
			Slug:   task.Slug,
			TaskId: task.ID.String(),
		})
	}
	return &v1.BulkCreateAdminTasksResponse{
		Results: results,
		Created: created,
		Failed:  failed,
	}, nil
}

func (i *Implementation) CreateAdminTask(ctx context.Context, req *v1.CreateAdminTaskRequest) (*v1.AdminTaskEnvelope, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	task, err := buildTask(req.Task, uuid.New())
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	task.CreatedAt = now
	task.UpdatedAt = now
	if err := i.admin.CreateTask(ctx, task); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	return &v1.AdminTaskEnvelope{Task: mapTask(task)}, nil
}

func (i *Implementation) GetAdminTask(ctx context.Context, req *v1.GetAdminTaskRequest) (*v1.AdminTaskEnvelope, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	taskID, err := parseUUID(req.TaskId, "INVALID_TASK_ID", "invalid task id")
	if err != nil {
		return nil, err
	}
	task, err := i.admin.GetTask(ctx, taskID)
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	if task == nil {
		return nil, kratoserrors.NotFound("TASK_NOT_FOUND", "task not found")
	}
	return &v1.AdminTaskEnvelope{Task: mapTask(task)}, nil
}

func (i *Implementation) UpdateAdminTask(ctx context.Context, req *v1.UpdateAdminTaskRequest) (*v1.AdminTaskEnvelope, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	taskID, err := parseUUID(req.TaskId, "INVALID_TASK_ID", "invalid task id")
	if err != nil {
		return nil, err
	}
	task, err := buildTask(req.Task, taskID)
	if err != nil {
		return nil, err
	}
	task.UpdatedAt = time.Now().UTC()
	if err := i.admin.UpdateTask(ctx, task); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	return &v1.AdminTaskEnvelope{Task: mapTask(task)}, nil
}

func (i *Implementation) DeleteAdminTask(ctx context.Context, req *v1.DeleteAdminTaskRequest) (*v1.StatusResponse, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	taskID, err := parseUUID(req.TaskId, "INVALID_TASK_ID", "invalid task id")
	if err != nil {
		return nil, err
	}
	if err := i.admin.DeleteTask(ctx, taskID); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	return &v1.StatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}

func (i *Implementation) ListAdminQuestions(ctx context.Context, req *v1.ListAdminQuestionsRequest) (*v1.ListAdminQuestionsResponse, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	taskID, err := parseUUID(req.TaskId, "INVALID_TASK_ID", "invalid task id")
	if err != nil {
		return nil, err
	}
	questions, err := i.admin.ListQuestionsByTask(ctx, taskID)
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	items := make([]*v1.InterviewPrepQuestion, 0, len(questions))
	for _, question := range questions {
		items = append(items, mapQuestion(question))
	}
	return &v1.ListAdminQuestionsResponse{Questions: items}, nil
}

func (i *Implementation) CreateAdminQuestion(ctx context.Context, req *v1.CreateAdminQuestionRequest) (*v1.AdminQuestionEnvelope, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	taskID, err := parseUUID(req.TaskId, "INVALID_TASK_ID", "invalid task id")
	if err != nil {
		return nil, err
	}
	question, err := buildQuestion(req.Question, taskID, uuid.New())
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	question.CreatedAt = now
	question.UpdatedAt = now
	if err := i.admin.CreateQuestion(ctx, question); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	return &v1.AdminQuestionEnvelope{Question: mapQuestion(question)}, nil
}

func (i *Implementation) UpdateAdminQuestion(ctx context.Context, req *v1.UpdateAdminQuestionRequest) (*v1.AdminQuestionEnvelope, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	taskID, err := parseUUID(req.TaskId, "INVALID_TASK_ID", "invalid task id")
	if err != nil {
		return nil, err
	}
	questionID, err := parseUUID(req.QuestionId, "INVALID_QUESTION_ID", "invalid question id")
	if err != nil {
		return nil, err
	}
	question, err := buildQuestion(req.Question, taskID, questionID)
	if err != nil {
		return nil, err
	}
	question.UpdatedAt = time.Now().UTC()
	if err := i.admin.UpdateQuestion(ctx, question); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	return &v1.AdminQuestionEnvelope{Question: mapQuestion(question)}, nil
}

func (i *Implementation) DeleteAdminQuestion(ctx context.Context, req *v1.DeleteAdminQuestionRequest) (*v1.StatusResponse, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	questionID, err := parseUUID(req.QuestionId, "INVALID_QUESTION_ID", "invalid question id")
	if err != nil {
		return nil, err
	}
	if err := i.admin.DeleteQuestion(ctx, questionID); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	return &v1.StatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}

func (i *Implementation) ListMockQuestionPools(ctx context.Context, req *v1.ListMockQuestionPoolsRequest) (*v1.MockQuestionPoolListResponse, error) {
	_ = req
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	items, err := i.admin.ListMockQuestionPools(ctx)
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	result := make([]*v1.MockQuestionPoolItem, 0, len(items))
	for _, item := range items {
		result = append(result, mapMockQuestionPoolItem(item))
	}
	return &v1.MockQuestionPoolListResponse{Items: result}, nil
}

func (i *Implementation) CreateMockQuestionPool(ctx context.Context, req *v1.CreateMockQuestionPoolRequest) (*v1.MockQuestionPoolEnvelope, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	item := &model.InterviewPrepMockQuestionPoolItem{
		ID:              uuid.New(),
		Topic:           req.Item.Topic,
		CompanyTag:      strings.TrimSpace(strings.ToLower(req.Item.CompanyTag)),
		QuestionKey:     req.Item.QuestionKey,
		Prompt:          req.Item.Prompt,
		ReferenceAnswer: req.Item.ReferenceAnswer,
		Position:        req.Item.Position,
		AlwaysAsk:       req.Item.AlwaysAsk,
		IsActive:        req.Item.IsActive,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := i.admin.CreateMockQuestionPool(ctx, item); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	return &v1.MockQuestionPoolEnvelope{Item: mapMockQuestionPoolItem(item)}, nil
}

func (i *Implementation) UpdateMockQuestionPool(ctx context.Context, req *v1.UpdateMockQuestionPoolRequest) (*v1.MockQuestionPoolEnvelope, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	itemID, err := parseUUID(req.Id, "INVALID_ITEM_ID", "invalid item id")
	if err != nil {
		return nil, err
	}
	item := &model.InterviewPrepMockQuestionPoolItem{
		ID:              itemID,
		Topic:           req.Item.Topic,
		CompanyTag:      strings.TrimSpace(strings.ToLower(req.Item.CompanyTag)),
		QuestionKey:     req.Item.QuestionKey,
		Prompt:          req.Item.Prompt,
		ReferenceAnswer: req.Item.ReferenceAnswer,
		Position:        req.Item.Position,
		AlwaysAsk:       req.Item.AlwaysAsk,
		IsActive:        req.Item.IsActive,
		UpdatedAt:       time.Now().UTC(),
	}
	if err := i.admin.UpdateMockQuestionPool(ctx, item); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	return &v1.MockQuestionPoolEnvelope{Item: mapMockQuestionPoolItem(item)}, nil
}

func (i *Implementation) DeleteMockQuestionPool(ctx context.Context, req *v1.DeleteMockQuestionPoolRequest) (*v1.StatusResponse, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	itemID, err := parseUUID(req.Id, "INVALID_ITEM_ID", "invalid item id")
	if err != nil {
		return nil, err
	}
	if err := i.admin.DeleteMockQuestionPool(ctx, itemID); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	return &v1.StatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}

func (i *Implementation) ListMockCompanyPresets(ctx context.Context, req *v1.ListMockCompanyPresetsRequest) (*v1.MockCompanyPresetListResponse, error) {
	_ = req
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	items, err := i.admin.ListMockCompanyPresets(ctx)
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	result := make([]*v1.MockCompanyPreset, 0, len(items))
	for _, item := range items {
		result = append(result, mapMockCompanyPreset(item))
	}
	return &v1.MockCompanyPresetListResponse{Items: result}, nil
}

func (i *Implementation) CreateMockCompanyPreset(ctx context.Context, req *v1.CreateMockCompanyPresetRequest) (*v1.MockCompanyPresetEnvelope, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	item := &model.InterviewPrepMockCompanyPreset{
		ID:              uuid.New(),
		CompanyTag:      strings.TrimSpace(strings.ToLower(req.Item.CompanyTag)),
		StageKind:       unmapMockStageKind(req.Item.StageKind),
		Position:        req.Item.Position,
		TaskSlugPattern: req.Item.TaskSlugPattern,
		AIModelOverride: req.Item.AiModelOverride,
		IsActive:        req.Item.IsActive,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := i.admin.CreateMockCompanyPreset(ctx, item); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	return &v1.MockCompanyPresetEnvelope{Item: mapMockCompanyPreset(item)}, nil
}

func (i *Implementation) UpdateMockCompanyPreset(ctx context.Context, req *v1.UpdateMockCompanyPresetRequest) (*v1.MockCompanyPresetEnvelope, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	itemID, err := parseUUID(req.Id, "INVALID_ITEM_ID", "invalid item id")
	if err != nil {
		return nil, err
	}
	item := &model.InterviewPrepMockCompanyPreset{
		ID:              itemID,
		CompanyTag:      strings.TrimSpace(strings.ToLower(req.Item.CompanyTag)),
		StageKind:       unmapMockStageKind(req.Item.StageKind),
		Position:        req.Item.Position,
		TaskSlugPattern: req.Item.TaskSlugPattern,
		AIModelOverride: req.Item.AiModelOverride,
		IsActive:        req.Item.IsActive,
		UpdatedAt:       time.Now().UTC(),
	}
	if err := i.admin.UpdateMockCompanyPreset(ctx, item); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	return &v1.MockCompanyPresetEnvelope{Item: mapMockCompanyPreset(item)}, nil
}

func (i *Implementation) DeleteMockCompanyPreset(ctx context.Context, req *v1.DeleteMockCompanyPresetRequest) (*v1.StatusResponse, error) {
	if err := requireAdmin(ctx); err != nil {
		return nil, err
	}
	itemID, err := parseUUID(req.Id, "INVALID_ITEM_ID", "invalid item id")
	if err != nil {
		return nil, err
	}
	if err := i.admin.DeleteMockCompanyPreset(ctx, itemID); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL_ERROR", err.Error())
	}
	return &v1.StatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}

func requireAdmin(ctx context.Context) error {
	user, ok := model.UserFromContext(ctx)
	if !ok || user == nil {
		return kratoserrors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	if !user.IsAdmin {
		return kratoserrors.Forbidden("FORBIDDEN", "admin access required")
	}
	return nil
}

func buildTask(payload *v1.AdminTaskPayload, taskID uuid.UUID) (*model.InterviewPrepTask, error) {
	if payload == nil {
		return nil, kratoserrors.BadRequest("BAD_REQUEST", "task payload is required")
	}

	req := normalizeTaskPayload(payload)
	if validationErr := validateTaskPayload(req); validationErr != "" {
		return nil, kratoserrors.BadRequest("BAD_REQUEST", validationErr)
	}

	return &model.InterviewPrepTask{
		ID:                 taskID,
		Slug:               req.Slug,
		Title:              req.Title,
		Statement:          req.Statement,
		PrepType:           unmapPrepType(req.PrepType),
		Language:           unmapProgrammingLanguage(req.Language),
		CompanyTag:         req.CompanyTag,
		SupportedLanguages: append([]string{}, req.SupportedLanguages...),
		IsExecutable:       req.IsExecutable,
		ExecutionProfile:   unmapExecutionProfile(req.ExecutionProfile),
		RunnerMode:         unmapRunnerMode(req.RunnerMode),
		DurationSeconds:    req.DurationSeconds,
		StarterCode:        req.StarterCode,
		ReferenceSolution:  req.ReferenceSolution,
		CodeTaskID:         parseOptionalUUID(req.CodeTaskId),
		IsActive:           req.IsActive,
		AIReviewPrompt:     strings.TrimSpace(req.AiReviewPrompt),
		IsPracticeEnabled:  req.IsPracticeEnabled,
		IsMockEnabled:      req.IsMockEnabled,
	}, nil
}

func buildQuestion(payload *v1.AdminQuestionPayload, taskID uuid.UUID, questionID uuid.UUID) (*model.InterviewPrepQuestion, error) {
	if payload == nil {
		return nil, kratoserrors.BadRequest("BAD_REQUEST", "question payload is required")
	}
	prompt := strings.TrimSpace(payload.Prompt)
	answer := strings.TrimSpace(payload.Answer)
	if payload.Position < 1 {
		return nil, kratoserrors.BadRequest("BAD_REQUEST", "position must be >= 1")
	}
	if prompt == "" || answer == "" {
		return nil, kratoserrors.BadRequest("BAD_REQUEST", "prompt and answer are required")
	}
	return &model.InterviewPrepQuestion{
		ID:       questionID,
		TaskID:   taskID,
		Position: payload.Position,
		Prompt:   prompt,
		Answer:   answer,
	}, nil
}

func normalizeTaskPayload(req *v1.AdminTaskPayload) *v1.AdminTaskPayload {
	req.Title = strings.TrimSpace(req.Title)
	req.Statement = strings.TrimSpace(req.Statement)
	req.CompanyTag = strings.TrimSpace(strings.ToLower(req.CompanyTag))
	req.StarterCode = strings.TrimSpace(req.StarterCode)
	req.ReferenceSolution = strings.TrimSpace(req.ReferenceSolution)
	req.CodeTaskId = strings.TrimSpace(req.CodeTaskId)
	req.Slug = normalizeSlug(req.Slug, req.Title)
	if req.PrepType == v1.PrepType_PREP_TYPE_UNSPECIFIED {
		req.PrepType = v1.PrepType_PREP_TYPE_ALGORITHM
	}
	if req.Language == commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_UNSPECIFIED {
		req.Language = commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_GO
	}
	if len(req.SupportedLanguages) == 0 {
		req.SupportedLanguages = []string{unmapProgrammingLanguage(req.Language)}
	}
	for idx := range req.SupportedLanguages {
		req.SupportedLanguages[idx] = strings.TrimSpace(strings.ToLower(req.SupportedLanguages[idx]))
	}
	if req.ExecutionProfile == commonv1.ExecutionProfile_EXECUTION_PROFILE_UNSPECIFIED {
		req.ExecutionProfile = commonv1.ExecutionProfile_EXECUTION_PROFILE_PURE
	}
	if req.RunnerMode == commonv1.RunnerMode_RUNNER_MODE_UNSPECIFIED {
		req.RunnerMode = commonv1.RunnerMode_RUNNER_MODE_FUNCTION_IO
	}
	if req.DurationSeconds <= 0 {
		req.DurationSeconds = 1800
	}
	return req
}

func validateTaskPayload(req *v1.AdminTaskPayload) string {
	if req.Title == "" {
		return "title is required"
	}
	if req.Slug == "" {
		return "slug is required"
	}
	if req.Statement == "" {
		return "statement is required"
	}
	if req.PrepType == v1.PrepType_PREP_TYPE_UNSPECIFIED {
		return "invalid prep type"
	}
	switch req.Language {
	case commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_GO,
		commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_PYTHON,
		commonv1.ProgrammingLanguage_PROGRAMMING_LANGUAGE_SQL:
	default:
		return "unsupported language"
	}
	for _, language := range req.SupportedLanguages {
		switch language {
		case "go", "python", "sql":
		default:
			return "unsupported supported language"
		}
	}
	if req.IsExecutable && req.CodeTaskId == "" {
		return "codeTaskId is required for executable tasks"
	}
	if req.CodeTaskId != "" {
		if _, err := uuid.Parse(req.CodeTaskId); err != nil {
			return "invalid codeTaskId"
		}
	}
	return ""
}

func parseOptionalUUID(raw string) *uuid.UUID {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	parsed, err := uuid.Parse(strings.TrimSpace(raw))
	if err != nil {
		return nil
	}
	return &parsed
}

var slugPattern = regexp.MustCompile(`[^a-z0-9]+`)

func normalizeSlug(rawSlug string, title string) string {
	value := strings.TrimSpace(strings.ToLower(rawSlug))
	if value == "" {
		value = strings.TrimSpace(strings.ToLower(title))
	}
	value = slugPattern.ReplaceAllString(value, "-")
	return strings.Trim(value, "-")
}
