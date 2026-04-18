package streak

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

type fakeRepo struct {
	row       *ShieldRow
	addCalls  []int32
	useCalled bool
}

func (f *fakeRepo) GetOrCreate(context.Context, uuid.UUID) (*ShieldRow, error) {
	if f.row == nil {
		f.row = &ShieldRow{OwnedCount: 0}
	}
	cp := *f.row
	return &cp, nil
}

func (f *fakeRepo) AddShields(_ context.Context, _ uuid.UUID, delta int32) error {
	f.addCalls = append(f.addCalls, delta)
	if f.row == nil {
		f.row = &ShieldRow{}
	}
	f.row.OwnedCount += delta
	return nil
}

func (f *fakeRepo) UseShield(_ context.Context, _ uuid.UUID, restoredTo int32) error {
	f.useCalled = true
	f.row.OwnedCount--
	t := time.Now()
	f.row.LastUsedAt = &t
	f.row.LastRestoredTo = &restoredTo
	return nil
}

type fakeStats struct {
	stats StreakStats
}

func (f *fakeStats) GetStreakStats(context.Context, uuid.UUID) (StreakStats, error) {
	return f.stats, nil
}

type fakeWallet struct {
	debited []int32
}

func (w *fakeWallet) DebitGold(_ context.Context, _ uuid.UUID, amount int32) error {
	w.debited = append(w.debited, amount)
	return nil
}

type fixedClock struct{ t time.Time }

func (c fixedClock) Now() time.Time { return c.t }

func TestGetStreak_NotBroken(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)
	active := now.Add(-2 * time.Hour)
	repo := &fakeRepo{row: &ShieldRow{OwnedCount: 2}}
	stats := &fakeStats{stats: StreakStats{CurrentDays: 5, LongestDays: 12, LastActiveAt: &active}}
	svc := NewService(Config{Repository: repo, Stats: stats, Clock: fixedClock{t: now}})

	st, err := svc.GetStreak(t.Context(), uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	if st.IsBroken {
		t.Fatal("streak should not be broken if last active 2h ago")
	}
	if st.CanRestore {
		t.Fatal("CanRestore should be false when not broken")
	}
	if st.ShieldsOwned != 2 {
		t.Fatalf("expected 2 shields, got %d", st.ShieldsOwned)
	}
}

func TestGetStreak_BrokenInWindow(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)
	active := now.Add(-26 * time.Hour)
	repo := &fakeRepo{row: &ShieldRow{OwnedCount: 1}}
	stats := &fakeStats{stats: StreakStats{CurrentDays: 0, LongestDays: 12, LastActiveAt: &active}}
	svc := NewService(Config{Repository: repo, Stats: stats, Clock: fixedClock{t: now}})

	st, _ := svc.GetStreak(t.Context(), uuid.New())
	if !st.IsBroken {
		t.Fatal("26h gap should be broken")
	}
	if !st.CanRestore {
		t.Fatal("26h gap should still be restorable (within 36h window)")
	}
}

func TestGetStreak_BrokenOutsideWindow(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)
	active := now.Add(-48 * time.Hour)
	repo := &fakeRepo{row: &ShieldRow{OwnedCount: 1}}
	stats := &fakeStats{stats: StreakStats{CurrentDays: 0, LongestDays: 12, LastActiveAt: &active}}
	svc := NewService(Config{Repository: repo, Stats: stats, Clock: fixedClock{t: now}})

	st, _ := svc.GetStreak(t.Context(), uuid.New())
	if !st.IsBroken {
		t.Fatal("48h gap should be broken")
	}
	if st.CanRestore {
		t.Fatal("48h gap is past restore window")
	}
}

func TestUseShield_RequiresBreak(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)
	active := now.Add(-2 * time.Hour) // not broken
	repo := &fakeRepo{row: &ShieldRow{OwnedCount: 1}}
	stats := &fakeStats{stats: StreakStats{CurrentDays: 5, LongestDays: 5, LastActiveAt: &active}}
	svc := NewService(Config{Repository: repo, Stats: stats, Clock: fixedClock{t: now}})

	_, _, err := svc.UseShield(t.Context(), uuid.New())
	if !errors.Is(err, ErrStreakNotBroken) {
		t.Fatalf("expected ErrStreakNotBroken, got %v", err)
	}
}

func TestUseShield_RequiresShields(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)
	active := now.Add(-26 * time.Hour)
	repo := &fakeRepo{row: &ShieldRow{OwnedCount: 0}}
	stats := &fakeStats{stats: StreakStats{CurrentDays: 0, LongestDays: 5, LastActiveAt: &active}}
	svc := NewService(Config{Repository: repo, Stats: stats, Clock: fixedClock{t: now}})

	_, _, err := svc.UseShield(t.Context(), uuid.New())
	if !errors.Is(err, ErrNoShieldsOwned) {
		t.Fatalf("expected ErrNoShieldsOwned, got %v", err)
	}
}

func TestUseShield_HappyPath(t *testing.T) {
	t.Parallel()
	now := time.Date(2026, 4, 18, 12, 0, 0, 0, time.UTC)
	active := now.Add(-26 * time.Hour)
	repo := &fakeRepo{row: &ShieldRow{OwnedCount: 1}}
	stats := &fakeStats{stats: StreakStats{CurrentDays: 0, LongestDays: 12, LastActiveAt: &active}}
	svc := NewService(Config{Repository: repo, Stats: stats, Clock: fixedClock{t: now}})

	state, restoredTo, err := svc.UseShield(t.Context(), uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	if !repo.useCalled {
		t.Fatal("repo.UseShield not called")
	}
	if restoredTo != 12 {
		t.Fatalf("expected restoredTo=12, got %d", restoredTo)
	}
	if state.IsBroken {
		t.Fatal("state should not be broken after restore")
	}
}

func TestPurchaseShield_DebitsGold(t *testing.T) {
	t.Parallel()
	wallet := &fakeWallet{}
	repo := &fakeRepo{}
	stats := &fakeStats{}
	svc := NewService(Config{Repository: repo, Stats: stats, Wallet: wallet})

	state, count, cost, err := svc.PurchaseShield(t.Context(), uuid.New(), 3)
	if err != nil {
		t.Fatal(err)
	}
	if count != 3 {
		t.Fatalf("expected 3 purchased, got %d", count)
	}
	if cost != ShieldPriceGold*3 {
		t.Fatalf("expected cost %d, got %d", ShieldPriceGold*3, cost)
	}
	if len(wallet.debited) != 1 || wallet.debited[0] != ShieldPriceGold*3 {
		t.Fatalf("wallet debit wrong: %v", wallet.debited)
	}
	if len(repo.addCalls) != 1 || repo.addCalls[0] != 3 {
		t.Fatalf("repo.AddShields calls: %v", repo.addCalls)
	}
	if state.ShieldsOwned != 3 {
		t.Fatalf("state.ShieldsOwned=%d", state.ShieldsOwned)
	}
}

func TestPurchaseShield_RejectsOversizedCount(t *testing.T) {
	t.Parallel()
	svc := NewService(Config{
		Repository: &fakeRepo{},
		Stats:      &fakeStats{},
	})
	_, _, balance, err := svc.PurchaseShield(t.Context(), uuid.New(), 99)
	_ = balance
	if !errors.Is(err, ErrInvalidCount) {
		t.Fatalf("expected ErrInvalidCount, got %v", err)
	}
}
