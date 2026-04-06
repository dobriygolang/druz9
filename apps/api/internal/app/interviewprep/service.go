package interviewprep

import (
	"api/internal/cache"
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"api/internal/aireview"
	"api/internal/app/taskjudge"
	"api/internal/model"
	"api/internal/sandbox"

	"github.com/google/uuid"
)

var (
	ErrTaskNotFound                = errors.New("task not found")
	ErrSessionNotFound             = errors.New("session not found")
	ErrMockSessionNotFound         = errors.New("mock interview session not found")
	ErrSessionFinished             = errors.New("session already finished")
	ErrMockSessionFinished         = errors.New("mock interview session already finished")
	ErrQuestionLocked              = errors.New("question is locked or not current")
	ErrMockStageSubmitNotAllowed   = errors.New("submit not allowed for current mock stage")
	ErrMockQuestionNotReady        = errors.New("follow-up question is not ready yet")
	ErrMockQuestionAnswerRequired  = errors.New("question answer is required")
	ErrMockCompanyTagRequired      = errors.New("company tag is required")
	ErrAnotherMockSessionActive    = errors.New("another mock session is already active: finish it before starting a new one")
	ErrMockTaskPoolIncomplete      = errors.New("mock interview task pool is incomplete for selected company")
	ErrMockQuestionPoolIncomplete  = errors.New("mock interview question pool is incomplete for selected company")
	ErrInvalidAssessment           = errors.New("invalid self assessment")
	ErrUnsupportedLanguage         = errors.New("unsupported interview prep language")
	ErrExecutableTaskNotConfigured = errors.New("executable interview prep task is not linked to a code task")
	ErrSubmitNotAllowed            = errors.New("submit not allowed: task is not executable")
	ErrSystemDesignOnly            = errors.New("ai review is available only for system design tasks")
	ErrInvalidReviewImage          = errors.New("invalid review image: only png, jpeg, webp are supported")
	ErrReviewImageTooLarge         = errors.New("review image is too large")
	ErrCheckpointUnsupported       = errors.New("checkpoint is available only for executable tasks")
	ErrCheckpointNotFound          = errors.New("checkpoint not found")
	ErrCheckpointExpired           = errors.New("checkpoint time expired")
	ErrCheckpointAttemptsExceeded  = errors.New("checkpoint attempts exceeded")
)

type Config struct {
	Repository        Repository
	Sandbox           Sandbox
	Reviewer          Reviewer
	MaxImageBytes     int64
	ModelCode         string
	ModelArchitecture string
	ModelFollowup     string
	ModelSystemDesign string
}

type SystemDesignReviewInput struct {
	Notes          string
	Components     string
	APIs           string
	DatabaseSchema string
	Traffic        string
	Reliability    string
}

type Sandbox interface {
	Execute(ctx context.Context, req sandbox.ExecutionRequest) (sandbox.ExecutionResult, error)
}

type Reviewer interface {
	ReviewSystemDesign(ctx context.Context, req aireview.SystemDesignReviewRequest) (*aireview.SystemDesignReview, error)
	ReviewInterviewSolution(ctx context.Context, req aireview.InterviewSolutionReviewRequest) (*aireview.InterviewSolutionReview, error)
	ReviewInterviewAnswer(ctx context.Context, req aireview.InterviewAnswerReviewRequest) (*aireview.InterviewAnswerReview, error)
}

type Repository interface {
	ListActiveTasks(ctx context.Context) ([]*model.InterviewPrepTask, error)
	GetTask(ctx context.Context, taskID uuid.UUID) (*model.InterviewPrepTask, error)
	ListQuestionsByTask(ctx context.Context, taskID uuid.UUID) ([]*model.InterviewPrepQuestion, error)
	GetQuestionByID(ctx context.Context, questionID uuid.UUID) (*model.InterviewPrepQuestion, error)
	GetQuestionByTaskAndPosition(ctx context.Context, taskID uuid.UUID, position int32) (*model.InterviewPrepQuestion, error)

	CreateSession(ctx context.Context, session *model.InterviewPrepSession) error
	GetSession(ctx context.Context, sessionID uuid.UUID) (*model.InterviewPrepSession, error)
	GetActiveSessionByUserAndTask(ctx context.Context, userID, taskID uuid.UUID) (*model.InterviewPrepSession, error)
	UpdateSessionCode(ctx context.Context, sessionID uuid.UUID, solveLanguage string, code string, passed bool) error
	AdvanceSessionQuestion(ctx context.Context, sessionID uuid.UUID, nextPosition int32) error
	FinishSession(ctx context.Context, sessionID uuid.UUID) error
	CreateCheckpoint(ctx context.Context, checkpoint *model.InterviewPrepCheckpoint) error
	GetCheckpointBySessionID(ctx context.Context, sessionID uuid.UUID) (*model.InterviewPrepCheckpoint, error)
	GetActiveCheckpointByUserAndTask(ctx context.Context, userID, taskID uuid.UUID) (*model.InterviewPrepCheckpoint, error)
	UpdateCheckpointState(ctx context.Context, checkpointID uuid.UUID, status model.InterviewPrepCheckpointStatus, attemptsUsed int32, score int32, finishedAt *time.Time) error

	UpsertQuestionResult(ctx context.Context, result *model.InterviewPrepQuestionResult) error
	ListQuestionResults(ctx context.Context, sessionID uuid.UUID) ([]*model.InterviewPrepQuestionResult, error)
	GetCodeTask(ctx context.Context, taskID uuid.UUID) (*model.CodeTask, error)
	ListMockQuestionPools(ctx context.Context) ([]*model.InterviewPrepMockQuestionPoolItem, error)
	ListMockCompanyPresets(ctx context.Context) ([]*model.InterviewPrepMockCompanyPreset, error)
	GetAvailableCompanies(ctx context.Context) ([]string, error)

	CreateMockSession(ctx context.Context, session *model.InterviewPrepMockSession, stages []*model.InterviewPrepMockStage, questionResults []*model.InterviewPrepMockQuestionResult) error
	GetMockSession(ctx context.Context, sessionID uuid.UUID) (*model.InterviewPrepMockSession, error)
	GetActiveMockSessionByUserAndCompany(ctx context.Context, userID uuid.UUID, companyTag string) (*model.InterviewPrepMockSession, error)
	GetAnyActiveMockSessionByUser(ctx context.Context, userID uuid.UUID) (*model.InterviewPrepMockSession, error)
	UpdateMockStageSubmission(ctx context.Context, stageID uuid.UUID, solveLanguage string, code string, passed bool, reviewScore int32, reviewSummary string, nextStatus model.InterviewPrepMockStageStatus) error
	CompleteMockQuestion(ctx context.Context, questionResultID uuid.UUID, score int32, summary string, answeredAt time.Time) error
	SetMockStageStatus(ctx context.Context, stageID uuid.UUID, status model.InterviewPrepMockStageStatus) error
	AdvanceMockSession(ctx context.Context, sessionID uuid.UUID, currentStageIndex int32) error
	CompleteMockStage(ctx context.Context, stageID uuid.UUID) error
	FinishMockSession(ctx context.Context, sessionID uuid.UUID) error
}

type Service struct {
	repo              Repository
	sandbox           Sandbox
	reviewer          Reviewer
	maxImageBytes     int64
	taskListCache     *cache.TTLCache[[]*model.InterviewPrepTask]
	codeTaskCache     *cache.TTLCache[*model.CodeTask]
	modelCode         string
	modelArchitecture string
	modelFollowup     string
	modelSystemDesign string
}

func New(c Config) *Service {
	return &Service{
		repo:              c.Repository,
		sandbox:           c.Sandbox,
		reviewer:          c.Reviewer,
		maxImageBytes:     maxImageBytesOrDefault(c.MaxImageBytes),
		taskListCache:     cache.NewTTLCache[[]*model.InterviewPrepTask](8, time.Minute),
		codeTaskCache:     cache.NewTTLCache[*model.CodeTask](64, 5*time.Minute),
		modelCode:         strings.TrimSpace(c.ModelCode),
		modelArchitecture: strings.TrimSpace(c.ModelArchitecture),
		modelFollowup:     strings.TrimSpace(c.ModelFollowup),
		modelSystemDesign: strings.TrimSpace(c.ModelSystemDesign),
	}
}

func (s *Service) ListTasks(ctx context.Context, user *model.User) ([]*model.InterviewPrepTask, error) {
	if s.taskListCache != nil {
		if items, ok := s.taskListCache.Get("active"); ok && len(items) > 0 {
			return items, nil
		}
	}
	items, err := s.repo.ListActiveTasks(ctx)
	if err != nil {
		return nil, err
	}
	if s.taskListCache != nil {
		s.taskListCache.Set("active", items, time.Minute)
	}
	return items, nil
}

func (s *Service) GetAvailableCompanies(ctx context.Context) ([]string, error) {
	return s.repo.GetAvailableCompanies(ctx)
}

func (s *Service) StartCheckpointSession(ctx context.Context, user *model.User, taskID uuid.UUID) (*model.InterviewPrepSession, *model.InterviewPrepCheckpoint, error) {
	task, err := s.repo.GetTask(ctx, taskID)
	if err != nil {
		return nil, nil, err
	}
	if task == nil || !task.IsActive {
		return nil, nil, ErrTaskNotFound
	}
	if !task.IsExecutable || task.CodeTaskID == nil {
		return nil, nil, ErrCheckpointUnsupported
	}

	skillKey := skillKeyForCheckpointTask(task)
	if skillKey == "" {
		return nil, nil, ErrCheckpointUnsupported
	}

	existingCheckpoint, err := s.repo.GetActiveCheckpointByUserAndTask(ctx, user.ID, taskID)
	if err != nil {
		return nil, nil, err
	}
	if existingCheckpoint != nil {
		session, err := s.GetSession(ctx, user, existingCheckpoint.SessionID)
		if err != nil {
			return nil, nil, err
		}
		checkpoint, err := s.GetCheckpointBySession(ctx, user, existingCheckpoint.SessionID)
		if err != nil {
			return nil, nil, err
		}
		return session, checkpoint, nil
	}

	nowTime := time.Now().UTC()
	session := &model.InterviewPrepSession{
		ID:                      uuid.New(),
		UserID:                  user.ID,
		TaskID:                  taskID,
		Status:                  model.InterviewPrepSessionStatusActive,
		CurrentQuestionPosition: 0,
		SolveLanguage:           normalizeSolveLanguage(task.Language),
		Code:                    task.StarterCode,
		LastSubmissionPassed:    false,
		StartedAt:               nowTime,
		CreatedAt:               nowTime,
		UpdatedAt:               nowTime,
	}
	if err := s.repo.CreateSession(ctx, session); err != nil {
		return nil, nil, err
	}

	checkpoint := &model.InterviewPrepCheckpoint{
		ID:              uuid.New(),
		UserID:          user.ID,
		TaskID:          taskID,
		SessionID:       session.ID,
		SkillKey:        skillKey,
		Status:          model.InterviewPrepCheckpointStatusActive,
		DurationSeconds: checkpointDurationSeconds(task),
		AttemptsUsed:    0,
		MaxAttempts:     2,
		Score:           0,
		StartedAt:       nowTime,
		CreatedAt:       nowTime,
		UpdatedAt:       nowTime,
	}
	if err := s.repo.CreateCheckpoint(ctx, checkpoint); err != nil {
		return nil, nil, err
	}

	fullSession, err := s.GetSession(ctx, user, session.ID)
	if err != nil {
		return nil, nil, err
	}
	return fullSession, checkpoint, nil
}

func (s *Service) GetCheckpointBySession(ctx context.Context, user *model.User, sessionID uuid.UUID) (*model.InterviewPrepCheckpoint, error) {
	checkpoint, err := s.repo.GetCheckpointBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if checkpoint == nil || checkpoint.UserID != user.ID {
		return nil, ErrCheckpointNotFound
	}
	return s.resolveCheckpointState(ctx, checkpoint)
}

func (s *Service) StartSession(ctx context.Context, user *model.User, taskID uuid.UUID) (*model.InterviewPrepSession, error) {
	task, err := s.repo.GetTask(ctx, taskID)
	if err != nil {
		return nil, err
	}
	if task == nil || !task.IsActive {
		return nil, ErrTaskNotFound
	}

	existing, err := s.repo.GetActiveSessionByUserAndTask(ctx, user.ID, taskID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return s.GetSession(ctx, user, existing.ID)
	}

	nowTime := time.Now()
	session := &model.InterviewPrepSession{
		ID:                      uuid.New(),
		UserID:                  user.ID,
		TaskID:                  taskID,
		Status:                  model.InterviewPrepSessionStatusActive,
		CurrentQuestionPosition: 0,
		SolveLanguage:           normalizeSolveLanguage(task.Language),
		Code:                    task.StarterCode,
		LastSubmissionPassed:    !task.IsExecutable,
		StartedAt:               nowTime,
		CreatedAt:               nowTime,
		UpdatedAt:               nowTime,
	}

	if !task.IsExecutable {
		session.CurrentQuestionPosition = 1
		session.LastSubmissionPassed = true
	}

	if err := s.repo.CreateSession(ctx, session); err != nil {
		// Race condition: another request already created active session
		// Try to return existing one
		existing, getErr := s.repo.GetActiveSessionByUserAndTask(ctx, user.ID, taskID)
		if getErr == nil && existing != nil {
			return s.GetSession(ctx, user, existing.ID)
		}
		return nil, err
	}

	return s.GetSession(ctx, user, session.ID)
}

func (s *Service) GetSession(ctx context.Context, user *model.User, sessionID uuid.UUID) (*model.InterviewPrepSession, error) {
	session, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if session == nil || session.UserID != user.ID {
		return nil, ErrSessionNotFound
	}

	task, err := s.repo.GetTask(ctx, session.TaskID)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, ErrTaskNotFound
	}
	session.Task = task

	// NOTE: Questions are not loaded here since they're not exposed via API
	// Only currentQuestion is needed for the session flow

	// Don't load current question for finished sessions
	if session.Status != model.InterviewPrepSessionStatusFinished && session.CurrentQuestionPosition > 0 {
		current, err := s.repo.GetQuestionByTaskAndPosition(ctx, session.TaskID, session.CurrentQuestionPosition)
		if err != nil {
			return nil, err
		}
		session.CurrentQuestion = current
	}

	results, err := s.repo.ListQuestionResults(ctx, session.ID)
	if err != nil {
		return nil, err
	}
	session.Results = results

	return session, nil
}

type SubmitResult struct {
	Passed          bool                        `json:"passed"`
	LastError       string                      `json:"lastError"`
	PassedCount     int32                       `json:"passedCount"`
	TotalCount      int32                       `json:"totalCount"`
	FailedTestIndex int32                       `json:"failedTestIndex"`
	FailureKind     string                      `json:"failureKind"`
	Session         *model.InterviewPrepSession `json:"session,omitempty"`
}

type QuestionAnswerResult struct {
	AnsweredQuestion *model.InterviewPrepQuestion    `json:"answeredQuestion,omitempty"`
	Review           *aireview.InterviewAnswerReview `json:"review,omitempty"`
	Session          *model.InterviewPrepSession     `json:"session,omitempty"`
}

type SystemDesignReviewResult = aireview.SystemDesignReview

func normalizeSolveLanguage(language string) string {
	return strings.TrimSpace(strings.ToLower(language))
}

func isSupportedInterviewPrepLanguage(language string) bool {
	switch normalizeSolveLanguage(language) {
	case "go", "python", "sql":
		return true
	default:
		return false
	}
}

func taskSupportsLanguage(task *model.InterviewPrepTask, language string) bool {
	if task == nil {
		return false
	}
	language = normalizeSolveLanguage(language)
	if len(task.SupportedLanguages) == 0 {
		return normalizeSolveLanguage(task.Language) == language
	}
	for _, candidate := range task.SupportedLanguages {
		if normalizeSolveLanguage(candidate) == language {
			return true
		}
	}
	return false
}

func firstNonEmptyLanguage(values ...string) string {
	for _, value := range values {
		if trimmed := normalizeSolveLanguage(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func (s *Service) Submit(ctx context.Context, user *model.User, sessionID uuid.UUID, code string, solveLanguage string) (*SubmitResult, error) {
	session, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if session == nil || session.UserID != user.ID {
		return nil, ErrSessionNotFound
	}
	if session.Status == model.InterviewPrepSessionStatusFinished {
		return nil, ErrSessionFinished
	}
	if session.Task == nil {
		session.Task, err = s.repo.GetTask(ctx, session.TaskID)
		if err != nil {
			return nil, err
		}
	}
	if session.Task == nil {
		return nil, ErrTaskNotFound
	}

	checkpoint, err := s.repo.GetCheckpointBySessionID(ctx, session.ID)
	if err != nil {
		return nil, err
	}
	if checkpoint != nil {
		if checkpoint.UserID != user.ID {
			return nil, ErrCheckpointNotFound
		}
		checkpoint, err = s.resolveCheckpointState(ctx, checkpoint)
		if err != nil {
			return nil, err
		}
		switch checkpoint.Status {
		case model.InterviewPrepCheckpointStatusExpired:
			if err := s.repo.FinishSession(ctx, session.ID); err != nil {
				return nil, err
			}
			return nil, ErrCheckpointExpired
		case model.InterviewPrepCheckpointStatusFailed:
			if err := s.repo.FinishSession(ctx, session.ID); err != nil {
				return nil, err
			}
			return nil, ErrCheckpointAttemptsExceeded
		case model.InterviewPrepCheckpointStatusPassed:
			return nil, ErrSessionFinished
		}
	}

	solveLanguage = normalizeSolveLanguage(firstNonEmptyLanguage(solveLanguage, session.SolveLanguage, session.Task.Language))
	if !isSupportedInterviewPrepLanguage(solveLanguage) {
		return nil, ErrUnsupportedLanguage
	}
	if !taskSupportsLanguage(session.Task, solveLanguage) {
		return nil, ErrUnsupportedLanguage
	}

	if session.Task.IsExecutable {
		if session.Task.CodeTaskID == nil {
			return nil, ErrExecutableTaskNotConfigured
		}

		codeTaskID := session.Task.CodeTaskID.String()
		var codeTask *model.CodeTask
		if s.codeTaskCache != nil {
			codeTask, _ = s.codeTaskCache.Get(codeTaskID)
		}
		if codeTask == nil {
			codeTask, err = s.repo.GetCodeTask(ctx, *session.Task.CodeTaskID)
			if err != nil {
				return nil, err
			}
			if s.codeTaskCache != nil && codeTask != nil {
				s.codeTaskCache.Set(codeTaskID, codeTask, 5*time.Minute)
			}
		}
		judgeResult, err := taskjudge.EvaluateCodeTask(ctx, s.sandbox, codeTask, code, solveLanguage)
		if err != nil {
			return nil, err
		}

		if err := s.repo.UpdateSessionCode(ctx, session.ID, solveLanguage, code, judgeResult.Passed); err != nil {
			return nil, err
		}

		if checkpoint != nil && checkpoint.Status == model.InterviewPrepCheckpointStatusActive {
			attemptsUsed := checkpoint.AttemptsUsed + 1
			if judgeResult.Passed {
				finishedAt := time.Now().UTC()
				score := computeCheckpointScore(&model.InterviewPrepCheckpoint{
					StartedAt:       checkpoint.StartedAt,
					DurationSeconds: checkpoint.DurationSeconds,
					AttemptsUsed:    attemptsUsed,
				}, finishedAt)
				if err := s.repo.UpdateCheckpointState(ctx, checkpoint.ID, model.InterviewPrepCheckpointStatusPassed, attemptsUsed, score, &finishedAt); err != nil {
					return nil, err
				}
				if err := s.repo.FinishSession(ctx, session.ID); err != nil {
					return nil, err
				}
			} else if attemptsUsed >= checkpoint.MaxAttempts {
				finishedAt := time.Now().UTC()
				if err := s.repo.UpdateCheckpointState(ctx, checkpoint.ID, model.InterviewPrepCheckpointStatusFailed, attemptsUsed, 0, &finishedAt); err != nil {
					return nil, err
				}
				if err := s.repo.FinishSession(ctx, session.ID); err != nil {
					return nil, err
				}
			} else if err := s.repo.UpdateCheckpointState(ctx, checkpoint.ID, model.InterviewPrepCheckpointStatusActive, attemptsUsed, 0, nil); err != nil {
				return nil, err
			}
		} else if judgeResult.Passed && session.CurrentQuestionPosition == 0 {
			nextQuestion, err := s.repo.GetQuestionByTaskAndPosition(ctx, session.TaskID, 1)
			if err != nil {
				return nil, err
			}
			if nextQuestion == nil {
				if err := s.repo.FinishSession(ctx, session.ID); err != nil {
					return nil, err
				}
			} else if err := s.repo.AdvanceSessionQuestion(ctx, session.ID, 1); err != nil {
				return nil, err
			}
		}

		nextSession, err := s.GetSession(ctx, user, session.ID)
		if err != nil {
			return nil, err
		}
		return &SubmitResult{
			Passed:          judgeResult.Passed,
			LastError:       judgeResult.LastError,
			PassedCount:     judgeResult.PassedCount,
			TotalCount:      judgeResult.TotalCount,
			FailedTestIndex: judgeResult.FailedTestIndex,
			FailureKind:     judgeResult.FailureKind.String(),
			Session:         nextSession,
		}, nil
	}

	// Non-executable задачи - пока только question-based flow
	return nil, ErrSubmitNotAllowed
}

func (s *Service) ReviewSystemDesign(ctx context.Context, user *model.User, sessionID uuid.UUID, fileName string, contentType string, imageBytes []byte, req SystemDesignReviewInput) (*SystemDesignReviewResult, error) {
	session, err := s.repo.GetSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if session == nil || session.UserID != user.ID {
		return nil, ErrSessionNotFound
	}
	if session.Task == nil {
		session.Task, err = s.repo.GetTask(ctx, session.TaskID)
		if err != nil {
			return nil, err
		}
	}
	if session.Task == nil {
		return nil, ErrTaskNotFound
	}
	if session.Task.PrepType != model.InterviewPrepTypeSystemDesign {
		return nil, ErrSystemDesignOnly
	}
	if len(imageBytes) == 0 {
		return nil, ErrInvalidReviewImage
	}
	if int64(len(imageBytes)) > s.maxImageBytes {
		return nil, ErrReviewImageTooLarge
	}

	normalizedType, err := normalizeReviewImageType(contentType, fileName)
	if err != nil {
		return nil, err
	}
	if s.reviewer == nil {
		return nil, aireview.ErrNotConfigured
	}

	return s.reviewer.ReviewSystemDesign(ctx, aireview.SystemDesignReviewRequest{
		TaskTitle:      session.Task.Title,
		Statement:      session.Task.Statement,
		Notes:          req.Notes,
		Components:     req.Components,
		APIs:           req.APIs,
		DatabaseSchema: req.DatabaseSchema,
		Traffic:        req.Traffic,
		Reliability:    req.Reliability,
		ImageBytes:     imageBytes,
		ImageMIME:      normalizedType,
		ImageName:      fileName,
	})
}

func (s *Service) AnswerQuestion(ctx context.Context, user *model.User, sessionID, questionID uuid.UUID, assessment string, answer string) (*QuestionAnswerResult, error) {
	session, err := s.GetSession(ctx, user, sessionID)
	if err != nil {
		return nil, err
	}
	if session.Status == model.InterviewPrepSessionStatusFinished {
		return nil, ErrSessionFinished
	}
	if checkpoint, err := s.repo.GetCheckpointBySessionID(ctx, session.ID); err == nil && checkpoint != nil {
		return nil, ErrQuestionLocked
	} else if err != nil {
		return nil, err
	}

	if session.CurrentQuestion == nil {
		return nil, ErrQuestionLocked
	}
	if session.CurrentQuestion.ID != questionID {
		return nil, ErrQuestionLocked
	}

	selfAssessment := model.InterviewPrepSelfAssessmentFromString(assessment)
	if selfAssessment != model.InterviewPrepSelfAssessmentAnswered && selfAssessment != model.InterviewPrepSelfAssessmentSkipped {
		return nil, ErrInvalidAssessment
	}

	answer = strings.TrimSpace(answer)
	var review *aireview.InterviewAnswerReview
	if selfAssessment == model.InterviewPrepSelfAssessmentAnswered && answer != "" && s.reviewer != nil {
		review, err = s.reviewer.ReviewInterviewAnswer(ctx, aireview.InterviewAnswerReviewRequest{
			ModelOverride:   s.modelFollowup,
			Topic:           session.Task.PrepType.String(),
			TaskTitle:       session.Task.Title,
			QuestionPrompt:  session.CurrentQuestion.Prompt,
			ReferenceAnswer: session.CurrentQuestion.Answer,
			CandidateAnswer: answer,
		})
		if err != nil {
			// AI review failure is non-fatal: proceed without review so the user
			// can still advance to the next question.
			review = nil
		}
	}

	answeredQuestion := session.CurrentQuestion
	nowTime := time.Now()
	result := &model.InterviewPrepQuestionResult{
		ID:             uuid.New(),
		SessionID:      session.ID,
		QuestionID:     questionID,
		SelfAssessment: selfAssessment,
		AnsweredAt:     nowTime,
	}
	if err := s.repo.UpsertQuestionResult(ctx, result); err != nil {
		return nil, err
	}

	nextPosition := session.CurrentQuestionPosition + 1
	nextQuestion, err := s.repo.GetQuestionByTaskAndPosition(ctx, session.TaskID, nextPosition)
	if err != nil {
		return nil, err
	}
	if nextQuestion == nil {
		if err := s.repo.FinishSession(ctx, session.ID); err != nil {
			return nil, err
		}
		nextSession, err := s.GetSession(ctx, user, session.ID)
		if err != nil {
			return nil, err
		}
		return &QuestionAnswerResult{
			AnsweredQuestion: answeredQuestion,
			Review:           review,
			Session:          nextSession,
		}, nil
	}

	if err := s.repo.AdvanceSessionQuestion(ctx, session.ID, nextPosition); err != nil {
		return nil, err
	}
	nextSession, err := s.GetSession(ctx, user, session.ID)
	if err != nil {
		return nil, err
	}
	return &QuestionAnswerResult{
		AnsweredQuestion: answeredQuestion,
		Review:           review,
		Session:          nextSession,
	}, nil
}

func normalizeReviewImageType(contentType string, fileName string) (string, error) {
	normalized := strings.ToLower(strings.TrimSpace(contentType))
	switch normalized {
	case "image/png", "image/jpeg", "image/jpg", "image/webp":
		if normalized == "image/jpg" {
			return "image/jpeg", nil
		}
		return normalized, nil
	}

	lowerName := strings.ToLower(strings.TrimSpace(fileName))
	switch {
	case strings.HasSuffix(lowerName, ".png"):
		return "image/png", nil
	case strings.HasSuffix(lowerName, ".jpg"), strings.HasSuffix(lowerName, ".jpeg"):
		return "image/jpeg", nil
	case strings.HasSuffix(lowerName, ".webp"):
		return "image/webp", nil
	default:
		return "", fmt.Errorf("%w", ErrInvalidReviewImage)
	}
}

func checkpointDurationSeconds(task *model.InterviewPrepTask) int32 {
	if task == nil {
		return 900
	}
	if task.DurationSeconds <= 0 {
		return 900
	}
	if task.DurationSeconds < 300 {
		return task.DurationSeconds
	}
	if task.DurationSeconds > 900 {
		return 900
	}
	return task.DurationSeconds
}

func skillKeyForCheckpointTask(task *model.InterviewPrepTask) string {
	if task == nil {
		return ""
	}
	switch task.PrepType {
	case model.InterviewPrepTypeCoding, model.InterviewPrepTypeAlgorithm:
		return model.InterviewPrepMockStageKindSlices.String()
	case model.InterviewPrepTypeSQL:
		return model.InterviewPrepMockStageKindSQL.String()
	default:
		return ""
	}
}

func (s *Service) resolveCheckpointState(ctx context.Context, checkpoint *model.InterviewPrepCheckpoint) (*model.InterviewPrepCheckpoint, error) {
	if checkpoint == nil {
		return nil, nil
	}
	if checkpoint.Status != model.InterviewPrepCheckpointStatusActive {
		return checkpoint, nil
	}
	if time.Now().UTC().After(checkpoint.StartedAt.Add(time.Duration(checkpoint.DurationSeconds) * time.Second)) {
		finishedAt := time.Now().UTC()
		if err := s.repo.UpdateCheckpointState(ctx, checkpoint.ID, model.InterviewPrepCheckpointStatusExpired, checkpoint.AttemptsUsed, checkpoint.Score, &finishedAt); err != nil {
			return nil, err
		}
		if err := s.repo.FinishSession(ctx, checkpoint.SessionID); err != nil {
			return nil, err
		}
		checkpoint.Status = model.InterviewPrepCheckpointStatusExpired
		checkpoint.FinishedAt = &finishedAt
		checkpoint.UpdatedAt = finishedAt
	}
	return checkpoint, nil
}

func computeCheckpointScore(checkpoint *model.InterviewPrepCheckpoint, finishedAt time.Time) int32 {
	if checkpoint == nil || checkpoint.DurationSeconds <= 0 {
		return 100
	}
	elapsed := finishedAt.Sub(checkpoint.StartedAt).Seconds()
	remainingRatio := 1 - math.Min(1, math.Max(0, elapsed/float64(checkpoint.DurationSeconds)))
	attemptPenalty := math.Max(0, float64(checkpoint.AttemptsUsed)*8)
	score := 72 + remainingRatio*28 - attemptPenalty
	if score < 60 {
		score = 60
	}
	if score > 100 {
		score = 100
	}
	return int32(math.Round(score))
}

func maxImageBytesOrDefault(v int64) int64 {
	if v <= 0 {
		return 5 * 1024 * 1024
	}
	return v
}
