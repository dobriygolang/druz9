package inbox

import (
	"context"
	"errors"
	"testing"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

// fakeRepo is a handcrafted mock avoiding mockery as a build-time requirement.
// Each method can be overridden by assigning its ...Fn field before the test.
type fakeRepo struct {
	listThreadsFn    func(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.InboxThread, int32, int32, error)
	getThreadFn      func(ctx context.Context, userID, threadID uuid.UUID) (*model.InboxThread, error)
	listMessagesFn   func(ctx context.Context, threadID uuid.UUID) ([]*model.InboxMessage, error)
	insertMessageFn  func(ctx context.Context, msg *model.InboxMessage) error
	markReadFn       func(ctx context.Context, userID, threadID uuid.UUID) error
	getUnreadTotalFn func(ctx context.Context, userID uuid.UUID) (int32, error)
	bumpThreadFn     func(ctx context.Context, threadID uuid.UUID, preview string, incrementUnread bool) error
}

func (f *fakeRepo) ListThreads(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]*model.InboxThread, int32, int32, error) {
	return f.listThreadsFn(ctx, userID, limit, offset)
}
func (f *fakeRepo) GetThread(ctx context.Context, userID, threadID uuid.UUID) (*model.InboxThread, error) {
	return f.getThreadFn(ctx, userID, threadID)
}
func (f *fakeRepo) ListMessages(ctx context.Context, threadID uuid.UUID) ([]*model.InboxMessage, error) {
	return f.listMessagesFn(ctx, threadID)
}
func (f *fakeRepo) InsertMessage(ctx context.Context, msg *model.InboxMessage) error {
	return f.insertMessageFn(ctx, msg)
}
func (f *fakeRepo) MarkThreadRead(ctx context.Context, userID, threadID uuid.UUID) error {
	return f.markReadFn(ctx, userID, threadID)
}
func (f *fakeRepo) GetUnreadTotal(ctx context.Context, userID uuid.UUID) (int32, error) {
	return f.getUnreadTotalFn(ctx, userID)
}
func (f *fakeRepo) BumpThread(ctx context.Context, threadID uuid.UUID, preview string, incrementUnread bool) error {
	return f.bumpThreadFn(ctx, threadID, preview, incrementUnread)
}

func TestListThreads_DefaultsAndClamping(t *testing.T) {
	t.Parallel()

	var capturedLimit int32
	repo := &fakeRepo{
		listThreadsFn: func(_ context.Context, _ uuid.UUID, limit, _ int32) ([]*model.InboxThread, int32, int32, error) {
			capturedLimit = limit
			return []*model.InboxThread{}, 0, 0, nil
		},
	}
	svc := NewService(Config{Repository: repo})

	cases := []struct {
		name     string
		input    int32
		expected int32
	}{
		{"zero uses default", 0, defaultListLimit},
		{"negative uses default", -1, defaultListLimit},
		{"valid passes through", 25, 25},
		{"above cap gets clamped", 5000, maxListLimit},
	}

	for _, c := range cases {
		c := c
		t.Run(c.name, func(t *testing.T) {
			_, err := svc.ListThreads(context.Background(), uuid.New(), c.input, 0)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if capturedLimit != c.expected {
				t.Fatalf("limit %d: got repo limit %d, want %d", c.input, capturedLimit, c.expected)
			}
		})
	}
}

func TestGetThread_NotFound(t *testing.T) {
	t.Parallel()
	repo := &fakeRepo{
		getThreadFn: func(context.Context, uuid.UUID, uuid.UUID) (*model.InboxThread, error) {
			return nil, nil // repo reports "no such row"
		},
	}
	svc := NewService(Config{Repository: repo})
	_, err := svc.GetThread(context.Background(), uuid.New(), uuid.New())
	if !errors.Is(err, ErrThreadNotFound) {
		t.Fatalf("expected ErrThreadNotFound, got %v", err)
	}
}

func TestGetThread_Forbidden(t *testing.T) {
	t.Parallel()
	owner := uuid.New()
	other := uuid.New()
	repo := &fakeRepo{
		getThreadFn: func(context.Context, uuid.UUID, uuid.UUID) (*model.InboxThread, error) {
			return &model.InboxThread{UserID: other, ID: uuid.New()}, nil
		},
	}
	svc := NewService(Config{Repository: repo})
	_, err := svc.GetThread(context.Background(), owner, uuid.New())
	if !errors.Is(err, ErrThreadNotOwned) {
		t.Fatalf("expected ErrThreadNotOwned, got %v", err)
	}
}

func TestGetThread_HappyPath(t *testing.T) {
	t.Parallel()
	owner := uuid.New()
	threadID := uuid.New()
	repo := &fakeRepo{
		getThreadFn: func(_ context.Context, _ uuid.UUID, id uuid.UUID) (*model.InboxThread, error) {
			return &model.InboxThread{
				ID: id, UserID: owner, Kind: model.ThreadKindMentor,
				Subject: "Varek", Interactive: true,
				LastMessageAt: time.Now(),
			}, nil
		},
		listMessagesFn: func(context.Context, uuid.UUID) ([]*model.InboxMessage, error) {
			return []*model.InboxMessage{
				{ID: uuid.New(), ThreadID: threadID, Body: "Hi", SenderName: "Varek"},
			}, nil
		},
	}
	svc := NewService(Config{Repository: repo})
	result, err := svc.GetThread(context.Background(), owner, threadID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Thread.ID != threadID {
		t.Fatalf("wrong thread id: %s", result.Thread.ID)
	}
	if len(result.Messages) != 1 {
		t.Fatalf("expected 1 message, got %d", len(result.Messages))
	}
}

func TestSendMessage_RejectsNonInteractive(t *testing.T) {
	t.Parallel()
	owner := uuid.New()
	threadID := uuid.New()
	repo := &fakeRepo{
		getThreadFn: func(context.Context, uuid.UUID, uuid.UUID) (*model.InboxThread, error) {
			return &model.InboxThread{
				ID: threadID, UserID: owner, Kind: model.ThreadKindSystem, Interactive: false,
			}, nil
		},
	}
	svc := NewService(Config{Repository: repo})
	_, err := svc.SendMessage(context.Background(), owner, threadID, "thornmoss", "hi")
	if !errors.Is(err, ErrNotInteractive) {
		t.Fatalf("expected ErrNotInteractive, got %v", err)
	}
}

func TestSendMessage_RejectsEmptyBody(t *testing.T) {
	t.Parallel()
	svc := NewService(Config{Repository: &fakeRepo{}})
	_, err := svc.SendMessage(context.Background(), uuid.New(), uuid.New(), "me", "   ")
	if !errors.Is(err, ErrMessageEmpty) {
		t.Fatalf("expected ErrMessageEmpty, got %v", err)
	}
}

func TestSendMessage_RejectsTooLong(t *testing.T) {
	t.Parallel()
	body := make([]byte, maxMessageLen+1)
	for i := range body {
		body[i] = 'a'
	}
	svc := NewService(Config{Repository: &fakeRepo{}})
	_, err := svc.SendMessage(context.Background(), uuid.New(), uuid.New(), "me", string(body))
	if !errors.Is(err, ErrMessageTooLong) {
		t.Fatalf("expected ErrMessageTooLong, got %v", err)
	}
}

func TestSendMessage_HappyPath(t *testing.T) {
	t.Parallel()
	owner := uuid.New()
	threadID := uuid.New()

	var insertedMsg *model.InboxMessage
	var bumpedThread uuid.UUID
	var bumpedPreview string
	var bumpedIncrement bool

	repo := &fakeRepo{
		getThreadFn: func(context.Context, uuid.UUID, uuid.UUID) (*model.InboxThread, error) {
			return &model.InboxThread{
				ID: threadID, UserID: owner, Kind: model.ThreadKindMentor, Interactive: true,
			}, nil
		},
		insertMessageFn: func(_ context.Context, m *model.InboxMessage) error {
			insertedMsg = m
			return nil
		},
		bumpThreadFn: func(_ context.Context, id uuid.UUID, preview string, inc bool) error {
			bumpedThread = id
			bumpedPreview = preview
			bumpedIncrement = inc
			return nil
		},
	}
	svc := NewService(Config{Repository: repo})

	msg, err := svc.SendMessage(context.Background(), owner, threadID, "thornmoss", "  hello there  ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg == nil || msg.Body != "hello there" {
		t.Fatalf("body not trimmed correctly: %#v", msg)
	}
	if insertedMsg == nil {
		t.Fatal("InsertMessage was not called")
	}
	if insertedMsg.SenderKind != model.SenderKindUser {
		t.Fatalf("wrong sender kind: %d", insertedMsg.SenderKind)
	}
	if !insertedMsg.Read {
		t.Fatal("author's own message must be marked read")
	}
	if bumpedThread != threadID {
		t.Fatalf("BumpThread got wrong id: %s vs %s", bumpedThread, threadID)
	}
	if bumpedPreview != "hello there" {
		t.Fatalf("preview %q", bumpedPreview)
	}
	if bumpedIncrement {
		t.Fatal("BumpThread must not increment unread for author's own reply")
	}
}

func TestMarkThreadRead_ReturnsUpdatedTotal(t *testing.T) {
	t.Parallel()
	owner := uuid.New()
	threadID := uuid.New()
	repo := &fakeRepo{
		getThreadFn: func(context.Context, uuid.UUID, uuid.UUID) (*model.InboxThread, error) {
			return &model.InboxThread{ID: threadID, UserID: owner, UnreadCount: 3}, nil
		},
		markReadFn:       func(context.Context, uuid.UUID, uuid.UUID) error { return nil },
		getUnreadTotalFn: func(context.Context, uuid.UUID) (int32, error) { return 7, nil },
	}
	svc := NewService(Config{Repository: repo})
	total, err := svc.MarkThreadRead(context.Background(), owner, threadID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != 7 {
		t.Fatalf("expected total 7, got %d", total)
	}
}

func TestPreviewOf_TruncatesLong(t *testing.T) {
	t.Parallel()
	long := make([]byte, previewLen+50)
	for i := range long {
		long[i] = 'x'
	}
	got := previewOf(string(long))
	// previewLen-1 ASCII bytes + "…" (3 UTF-8 bytes) = previewLen+2 bytes total
	const ellipsis = "…"
	if len(got) != previewLen-1+len(ellipsis) {
		t.Fatalf("got %d bytes, want %d", len(got), previewLen-1+len(ellipsis))
	}
	if got[len(got)-len(ellipsis):] != ellipsis {
		t.Fatalf("expected ellipsis suffix, got %q", got)
	}
}

func TestPreviewOf_CollapsesWhitespace(t *testing.T) {
	t.Parallel()
	got := previewOf("hello\n  \t  world")
	if got != "hello world" {
		t.Fatalf("expected collapsed preview, got %q", got)
	}
}
