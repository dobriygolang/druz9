// Package inbox holds the business logic for per-user inbox threads and
// messages. The data layer (see internal/data/inbox) handles persistence;
// this package is pure domain code and has no DB or transport dependencies
// beyond its Repository interface.
package inbox

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"api/internal/model"
)

const (
	defaultListLimit = 50
	maxListLimit     = 100
	maxMessageLen    = 4000
	previewLen       = 120
)

//go:generate mockery --case underscore --name Repository --with-expecter --output mocks

// Repository is the DB-backed store the domain service depends on.
type Repository interface {
	ListThreads(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.InboxThread, int32, int32, error)
	GetThread(ctx context.Context, userID, threadID uuid.UUID) (*model.InboxThread, error)
	ListMessages(ctx context.Context, threadID uuid.UUID) ([]*model.InboxMessage, error)
	InsertMessage(ctx context.Context, msg *model.InboxMessage) error
	MarkThreadRead(ctx context.Context, userID, threadID uuid.UUID) error
	GetUnreadTotal(ctx context.Context, userID uuid.UUID) (int32, error)
	BumpThread(ctx context.Context, threadID uuid.UUID, preview string, incrementUnread bool) error
	CreateDirectThread(ctx context.Context, senderID, recipientID uuid.UUID, senderName, recipientName, subject string) (*model.InboxThread, error)
}

// Config bundles domain dependencies.
type Config struct {
	Repository Repository
}

// Service exposes inbox domain operations.
type Service struct {
	repo Repository
}

// NewService constructs a Service.
func NewService(c Config) *Service {
	return &Service{repo: c.Repository}
}

// Common domain errors. API layer maps these to kratos error codes.
var (
	ErrThreadNotFound = errors.New("inbox: thread not found")
	ErrThreadNotOwned = errors.New("inbox: thread does not belong to user")
	ErrNotInteractive = errors.New("inbox: thread does not accept user replies")
	ErrMessageEmpty   = errors.New("inbox: message body is empty")
	ErrMessageTooLong = errors.New("inbox: message body exceeds 4000 chars")
)

// ListThreads returns the user's threads newest-first with a running unread total.
func (s *Service) ListThreads(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.ThreadList, error) {
	if limit <= 0 {
		limit = defaultListLimit
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	if offset < 0 {
		offset = 0
	}

	threads, total, unreadTotal, err := s.repo.ListThreads(ctx, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list threads: %w", err)
	}
	if threads == nil {
		threads = []*model.InboxThread{}
	}
	return &model.ThreadList{
		Threads:     threads,
		Total:       total,
		UnreadTotal: unreadTotal,
	}, nil
}

// GetThread returns thread + messages. Caller must own the thread.
func (s *Service) GetThread(ctx context.Context, userID, threadID uuid.UUID) (*model.ThreadWithMessages, error) {
	thread, err := s.repo.GetThread(ctx, userID, threadID)
	if err != nil {
		return nil, fmt.Errorf("get thread: %w", err)
	}
	if thread == nil {
		return nil, ErrThreadNotFound
	}
	if thread.UserID != userID {
		return nil, ErrThreadNotOwned
	}

	messages, err := s.repo.ListMessages(ctx, threadID)
	if err != nil {
		return nil, fmt.Errorf("list messages: %w", err)
	}
	if messages == nil {
		messages = []*model.InboxMessage{}
	}
	return &model.ThreadWithMessages{Thread: thread, Messages: messages}, nil
}

// MarkThreadRead zeros the unread counter and returns the caller's updated total.
func (s *Service) MarkThreadRead(ctx context.Context, userID, threadID uuid.UUID) (int32, error) {
	thread, err := s.repo.GetThread(ctx, userID, threadID)
	if err != nil {
		return 0, fmt.Errorf("get thread: %w", err)
	}
	if thread == nil {
		return 0, ErrThreadNotFound
	}
	if thread.UserID != userID {
		return 0, ErrThreadNotOwned
	}

	if err := s.repo.MarkThreadRead(ctx, userID, threadID); err != nil {
		return 0, fmt.Errorf("mark thread read: %w", err)
	}
	unread, err := s.repo.GetUnreadTotal(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("get unread total: %w", err)
	}
	return unread, nil
}

// SendMessage appends a user-authored reply to an interactive thread.
// Non-interactive kinds (system, guild-bot) are rejected.
func (s *Service) SendMessage(
	ctx context.Context,
	userID, threadID uuid.UUID,
	senderName, body string,
) (*model.InboxMessage, error) {
	body = strings.TrimSpace(body)
	if body == "" {
		return nil, ErrMessageEmpty
	}
	if len(body) > maxMessageLen {
		return nil, ErrMessageTooLong
	}

	thread, err := s.repo.GetThread(ctx, userID, threadID)
	if err != nil {
		return nil, fmt.Errorf("get thread: %w", err)
	}
	if thread == nil {
		return nil, ErrThreadNotFound
	}
	if thread.UserID != userID {
		return nil, ErrThreadNotOwned
	}
	if !thread.Interactive {
		return nil, ErrNotInteractive
	}

	senderID := userID
	msg := &model.InboxMessage{
		ID:         uuid.New(),
		ThreadID:   threadID,
		SenderKind: model.SenderKindUser,
		SenderID:   &senderID,
		SenderName: senderName,
		Body:       body,
		Read:       true, // author reads their own message by definition
	}
	if err := s.repo.InsertMessage(ctx, msg); err != nil {
		return nil, fmt.Errorf("insert message: %w", err)
	}
	// Bump thread metadata but don't increment unread (author's own reply).
	if err := s.repo.BumpThread(ctx, threadID, previewOf(body), false); err != nil {
		return nil, fmt.Errorf("bump thread: %w", err)
	}
	return msg, nil
}

// GetUnreadCount returns the total across all threads for badge rendering.
func (s *Service) GetUnreadCount(ctx context.Context, userID uuid.UUID) (int32, error) {
	unread, err := s.repo.GetUnreadTotal(ctx, userID)
	if err != nil {
		return 0, fmt.Errorf("get unread total: %w", err)
	}
	return unread, nil
}

// CreateDirectThread opens (or returns existing) a bidirectional friend-mail
// thread. Names are resolved by the caller before invoking this method.
func (s *Service) CreateDirectThread(ctx context.Context, senderID, recipientID uuid.UUID, senderName, recipientName, subject string) (*model.InboxThread, error) {
	thread, err := s.repo.CreateDirectThread(ctx, senderID, recipientID, senderName, recipientName, subject)
	if err != nil {
		return nil, fmt.Errorf("create direct thread: %w", err)
	}
	return thread, nil
}

// previewOf collapses newlines and trims to previewLen for the thread preview.
func previewOf(body string) string {
	cleaned := strings.Join(strings.Fields(body), " ")
	if len(cleaned) <= previewLen {
		return cleaned
	}
	return cleaned[:previewLen-1] + "…"
}
