package codeeditor

import (
	"context"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

type Repository interface {
	CreateRoom(ctx context.Context, room *Room) (*Room, error)
	GetRoom(ctx context.Context, roomID uuid.UUID) (*Room, error)
	GetRoomByInviteCode(ctx context.Context, inviteCode string) (*Room, error)
	SaveCodeSnapshot(ctx context.Context, roomID uuid.UUID, code string) error
	UpdateRoomStatus(ctx context.Context, roomID uuid.UUID, status model.RoomStatus) error
	AddParticipant(ctx context.Context, roomID uuid.UUID, participant *Participant) (*Room, error)
	RemoveParticipant(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) error
	SetParticipantReady(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, ready bool) error
	SetWinner(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) error
	StartDuel(ctx context.Context, roomID uuid.UUID, startedAt time.Time) error
	FinishDuel(ctx context.Context, roomID uuid.UUID, winnerUserID *uuid.UUID, winnerGuestName string, finishedAt time.Time) error
	CreateSubmission(ctx context.Context, submission *Submission) (*Submission, error)
	GetSubmissions(ctx context.Context, roomID uuid.UUID) ([]*Submission, error)
	CleanupInactiveRooms(ctx context.Context, idleFor time.Duration) (int64, error)
	CleanupOldSubmissions(ctx context.Context, idleFor time.Duration) (int64, error)
	ListTasks(ctx context.Context, filter TaskFilter) ([]*Task, error)
	CreateTask(ctx context.Context, task *Task) (*Task, error)
	UpdateTask(ctx context.Context, task *Task) (*Task, error)
	DeleteTask(ctx context.Context, taskID uuid.UUID) error
	GetTask(ctx context.Context, taskID uuid.UUID) (*Task, error)
	PickRandomTask(ctx context.Context, topic, difficulty string) (*Task, error)
	GetLeaderboard(ctx context.Context, limit int32) ([]*LeaderboardEntry, error)
}
