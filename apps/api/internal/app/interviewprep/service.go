package interviewprep

import (
	"context"
	"errors"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

var (
	ErrForbidden                = errors.New("forbidden: user is not trusted")
	ErrTaskNotFound             = errors.New("task not found")
	ErrSessionNotFound          = errors.New("session not found")
	ErrSessionFinished          = errors.New("session already finished")
	ErrSubmitNotAllowed         = errors.New("submit not allowed: task is not executable")
	ErrQuestionLocked           = errors.New("question is locked or not current")
	ErrInvalidAssessment        = errors.New("invalid self assessment")
	ErrUnsupportedLanguage      = errors.New("unsupported interview prep language")
	ErrExecutableTasksNotSupported = errors.New("executable interview prep tasks are not yet supported")
)

type Config struct {
	Repository Repository
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
	UpdateSessionCode(ctx context.Context, sessionID uuid.UUID, code string, passed bool) error
	AdvanceSessionQuestion(ctx context.Context, sessionID uuid.UUID, nextPosition int32) error
	FinishSession(ctx context.Context, sessionID uuid.UUID) error

	UpsertQuestionResult(ctx context.Context, result *model.InterviewPrepQuestionResult) error
	ListQuestionResults(ctx context.Context, sessionID uuid.UUID) ([]*model.InterviewPrepQuestionResult, error)
}

type Service struct {
	repo Repository
}

func New(c Config) *Service {
	return &Service{
		repo: c.Repository,
	}
}

func ensureTrusted(user *model.User) error {
	if user == nil || !user.IsTrusted {
		return ErrForbidden
	}
	return nil
}

func (s *Service) ListTasks(ctx context.Context, user *model.User) ([]*model.InterviewPrepTask, error) {
	if err := ensureTrusted(user); err != nil {
		return nil, err
	}
	return s.repo.ListActiveTasks(ctx)
}

func (s *Service) StartSession(ctx context.Context, user *model.User, taskID uuid.UUID) (*model.InterviewPrepSession, error) {
	if err := ensureTrusted(user); err != nil {
		return nil, err
	}

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
	if err := ensureTrusted(user); err != nil {
		return nil, err
	}

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
	Passed    bool                          `json:"passed"`
	LastError string                        `json:"lastError"`
	Session   *model.InterviewPrepSession  `json:"session,omitempty"`
}

func (s *Service) Submit(ctx context.Context, user *model.User, sessionID uuid.UUID, code string) (*SubmitResult, error) {
	if err := ensureTrusted(user); err != nil {
		return nil, err
	}

	session, err := s.GetSession(ctx, user, sessionID)
	if err != nil {
		return nil, err
	}
	if session.Status == model.InterviewPrepSessionStatusFinished {
		return nil, ErrSessionFinished
	}
	if session.Task == nil {
		return nil, ErrTaskNotFound
	}

	// Проверка: поддерживаемый язык
	if session.Task.Language != "" && session.Task.Language != "go" {
		return nil, ErrUnsupportedLanguage
	}

	// Executable tasks не поддержаны - нет test cases для валидации
	if session.Task.IsExecutable {
		return nil, ErrExecutableTasksNotSupported
	}

	// Non-executable задачи - пока только question-based flow
	return nil, ErrSubmitNotAllowed
}

func (s *Service) AnswerQuestion(ctx context.Context, user *model.User, sessionID, questionID uuid.UUID, assessment string) (*model.InterviewPrepSession, error) {
	if err := ensureTrusted(user); err != nil {
		return nil, err
	}

	session, err := s.GetSession(ctx, user, sessionID)
	if err != nil {
		return nil, err
	}
	if session.Status == model.InterviewPrepSessionStatusFinished {
		return nil, ErrSessionFinished
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
		return s.GetSession(ctx, user, session.ID)
	}

	if err := s.repo.AdvanceSessionQuestion(ctx, session.ID, nextPosition); err != nil {
		return nil, err
	}
	return s.GetSession(ctx, user, session.ID)
}