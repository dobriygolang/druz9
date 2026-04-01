package interviewprep

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	ListActiveTasks(ctx context.Context) ([]*Task, error)
	GetTask(ctx context.Context, taskID uuid.UUID) (*Task, error)
	ListQuestionsByTask(ctx context.Context, taskID uuid.UUID) ([]*Question, error)
	GetQuestionByID(ctx context.Context, questionID uuid.UUID) (*Question, error)
	GetQuestionByTaskAndPosition(ctx context.Context, taskID uuid.UUID, position int32) (*Question, error)

	CreateSession(ctx context.Context, session *Session) error
	GetSession(ctx context.Context, sessionID uuid.UUID) (*Session, error)
	GetActiveSessionByUserAndTask(ctx context.Context, userID, taskID uuid.UUID) (*Session, error)
	UpdateSessionCode(ctx context.Context, sessionID uuid.UUID, code string, passed bool) error
	AdvanceSessionQuestion(ctx context.Context, sessionID uuid.UUID, nextPosition int32) error
	FinishSession(ctx context.Context, sessionID uuid.UUID) error

	UpsertQuestionResult(ctx context.Context, result *QuestionResult) error
	ListQuestionResults(ctx context.Context, sessionID uuid.UUID) ([]*QuestionResult, error)
}