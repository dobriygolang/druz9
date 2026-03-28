package code_editor

import (
	"context"

	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/dto"
	v1 "api/pkg/api/code_editor/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

type Service interface {
	CreateRoom(ctx context.Context, creatorID *uuid.UUID, name string, isGuest bool, mode string, topic string, difficulty string) (*codeeditordomain.Room, error)
	GetRoom(ctx context.Context, roomID uuid.UUID) (*codeeditordomain.Room, error)
	JoinRoom(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, name string, isGuest bool) (*codeeditordomain.Room, error)
	JoinRoomByInviteCode(ctx context.Context, inviteCode string, userID *uuid.UUID, name string, isGuest bool) (*codeeditordomain.Room, error)
	LeaveRoom(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) error
	SubmitCode(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, code string) (*codeeditordomain.Submission, error)
	SetReady(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, ready bool) error
	GetSubmissions(ctx context.Context, roomID uuid.UUID) ([]*codeeditordomain.Submission, error)
	ListTasks(ctx context.Context, filter codeeditordomain.TaskFilter) ([]*codeeditordomain.Task, error)
	CreateTask(ctx context.Context, task *codeeditordomain.Task) (*codeeditordomain.Task, error)
	UpdateTask(ctx context.Context, task *codeeditordomain.Task) (*codeeditordomain.Task, error)
	DeleteTask(ctx context.Context, taskID uuid.UUID) error
	GetLeaderboard(ctx context.Context, limit int32) ([]*codeeditordomain.LeaderboardEntry, error)
}

type RealtimePublisher interface {
	PublishRoomUpdate(room *dto.CodeEditorRealtimeRoom)
	PublishSubmission(roomID string, submission *dto.CodeEditorSubmissionEvent)
}

// Implementation of code editor service.
type Implementation struct {
	v1.UnimplementedCodeEditorServiceServer
	service  Service
	realtime RealtimePublisher
}

// New returns new instance of Implementation.
func New(service Service, realtime RealtimePublisher) *Implementation {
	return &Implementation{
		service:  service,
		realtime: realtime,
	}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.CodeEditorService_ServiceDesc
}
