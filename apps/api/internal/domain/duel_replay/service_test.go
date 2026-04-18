package duel_replay

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"api/internal/model"
)

type fakeRepo struct {
	summary  *model.DuelReplaySummary
	events   []*model.DuelReplayEvent
	inserted []*model.DuelReplayEvent
}

func (f *fakeRepo) GetSummary(context.Context, uuid.UUID) (*model.DuelReplaySummary, error) {
	return f.summary, nil
}

func (f *fakeRepo) ListEvents(context.Context, uuid.UUID) ([]*model.DuelReplayEvent, error) {
	return f.events, nil
}

func (f *fakeRepo) ListForUser(context.Context, uuid.UUID, int32, int32) ([]*model.DuelReplaySummary, int32, error) {
	return nil, 0, nil
}

func (f *fakeRepo) InsertEvent(_ context.Context, ev *model.DuelReplayEvent) error {
	f.inserted = append(f.inserted, ev)
	return nil
}
func (f *fakeRepo) CreateReplay(context.Context, *model.DuelReplaySummary) error { return nil }

func TestGetReplay_AllowsParticipant(t *testing.T) {
	t.Parallel()
	p1, p2 := uuid.New(), uuid.New()
	repo := &fakeRepo{summary: &model.DuelReplaySummary{
		ID: uuid.New(), Player1ID: p1, Player2ID: p2, CompletedAt: time.Now(),
	}}
	svc := NewService(Config{Repository: repo})
	viewer := p1
	result, err := svc.GetReplay(t.Context(), repo.summary.ID, &viewer)
	if err != nil {
		t.Fatal(err)
	}
	if result.Summary == nil {
		t.Fatal("nil summary")
	}
}

func TestGetReplay_RejectsOutsider(t *testing.T) {
	t.Parallel()
	p1, p2 := uuid.New(), uuid.New()
	repo := &fakeRepo{summary: &model.DuelReplaySummary{
		ID: uuid.New(), Player1ID: p1, Player2ID: p2, CompletedAt: time.Now(),
	}}
	svc := NewService(Config{Repository: repo})
	outsider := uuid.New()
	_, err := svc.GetReplay(t.Context(), repo.summary.ID, &outsider)
	if !errors.Is(err, ErrNotParticipant) {
		t.Fatalf("expected ErrNotParticipant, got %v", err)
	}
}

func TestGetReplay_NotFound(t *testing.T) {
	t.Parallel()
	repo := &fakeRepo{summary: nil}
	svc := NewService(Config{Repository: repo})
	_, err := svc.GetReplay(t.Context(), uuid.New(), nil)
	if !errors.Is(err, ErrReplayNotFound) {
		t.Fatalf("expected ErrReplayNotFound, got %v", err)
	}
}

func TestGetReplay_AdminBypass(t *testing.T) {
	t.Parallel()
	// viewer=nil means "admin" read; no participant check.
	p1, p2 := uuid.New(), uuid.New()
	repo := &fakeRepo{summary: &model.DuelReplaySummary{
		ID: uuid.New(), Player1ID: p1, Player2ID: p2, CompletedAt: time.Now(),
	}}
	svc := NewService(Config{Repository: repo})
	_, err := svc.GetReplay(t.Context(), repo.summary.ID, nil)
	if err != nil {
		t.Fatalf("admin read should succeed, got %v", err)
	}
}

func TestRecordEvent_ValidatesTimeRange(t *testing.T) {
	t.Parallel()
	p1 := uuid.New()
	svc := NewService(Config{Repository: &fakeRepo{summary: &model.DuelReplaySummary{Player1ID: p1}}})

	_, err := svc.RecordEvent(t.Context(), model.RecordEventInput{
		UserID: p1, TMs: -1, Kind: model.ReplayEventKindRun,
	})
	if !errors.Is(err, ErrBadTimeMs) {
		t.Fatalf("expected ErrBadTimeMs for negative, got %v", err)
	}

	_, err = svc.RecordEvent(t.Context(), model.RecordEventInput{
		UserID: p1, TMs: maxEventTMs + 1, Kind: model.ReplayEventKindRun,
	})
	if !errors.Is(err, ErrBadTimeMs) {
		t.Fatalf("expected ErrBadTimeMs for overflow, got %v", err)
	}
}

func TestRecordEvent_RejectsNonParticipant(t *testing.T) {
	t.Parallel()
	p1, p2 := uuid.New(), uuid.New()
	repo := &fakeRepo{summary: &model.DuelReplaySummary{
		ID: uuid.New(), Player1ID: p1, Player2ID: p2,
	}}
	svc := NewService(Config{Repository: repo})
	_, err := svc.RecordEvent(t.Context(), model.RecordEventInput{
		ReplayID: repo.summary.ID, UserID: uuid.New(), TMs: 100, Kind: model.ReplayEventKindRun,
	})
	if !errors.Is(err, ErrNotParticipant) {
		t.Fatalf("expected ErrNotParticipant, got %v", err)
	}
}

func TestRecordEvent_HappyPath(t *testing.T) {
	t.Parallel()
	p1, p2 := uuid.New(), uuid.New()
	repo := &fakeRepo{summary: &model.DuelReplaySummary{
		ID: uuid.New(), Player1ID: p1, Player2ID: p2,
	}}
	svc := NewService(Config{Repository: repo})
	ev, err := svc.RecordEvent(t.Context(), model.RecordEventInput{
		ReplayID: repo.summary.ID, UserID: p2, TMs: 5_000, Kind: model.ReplayEventKindSubmitPass,
		Label: "ACCEPTED · 6/6",
	})
	if err != nil {
		t.Fatal(err)
	}
	if ev.UserID != p2 {
		t.Fatal("wrong user")
	}
	if len(repo.inserted) != 1 {
		t.Fatalf("expected 1 insert, got %d", len(repo.inserted))
	}
}

func TestRecordEvent_LabelTooLong(t *testing.T) {
	t.Parallel()
	p1 := uuid.New()
	repo := &fakeRepo{summary: &model.DuelReplaySummary{ID: uuid.New(), Player1ID: p1, Player2ID: uuid.New()}}
	svc := NewService(Config{Repository: repo})

	label := make([]byte, maxLabelLen+1)
	for i := range label {
		label[i] = 'x'
	}
	_, err := svc.RecordEvent(t.Context(), model.RecordEventInput{
		ReplayID: repo.summary.ID, UserID: p1, TMs: 10, Kind: model.ReplayEventKindRun,
		Label: string(label),
	})
	if !errors.Is(err, ErrLabelTooLong) {
		t.Fatalf("expected ErrLabelTooLong, got %v", err)
	}
}
