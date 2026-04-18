// Package streak implements the shield-protection layer on top of derived
// streak counts. Raw streak (current/longest) comes from the profile
// progress layer via the StreakStatsProvider interface; this package owns
// shield inventory and the restore/purchase flow.
package streak

import (
	"context"
	"errors"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

const (
	// ShieldPriceGold is the fixed price for one shield purchase.
	ShieldPriceGold int32 = 200
	// MaxPurchasePerCall caps a single PurchaseShield RPC to avoid
	// accidental mega-purchases.
	MaxPurchasePerCall int32 = 5
	// RestoreWindow is how long after the streak break a shield still
	// restores it. If the user waits longer, the streak is permanently lost.
	RestoreWindow = 36 * time.Hour
)

//go:generate mockery --case underscore --name Repository --with-expecter --output mocks

// Repository is the shield-inventory persistence boundary.
type Repository interface {
	GetOrCreate(ctx context.Context, userID uuid.UUID) (*ShieldRow, error)
	AddShields(ctx context.Context, userID uuid.UUID, delta int32) error
	UseShield(ctx context.Context, userID uuid.UUID, restoredTo int32) error
}

//go:generate mockery --case underscore --name StreakStatsProvider --with-expecter --output mocks

// StreakStatsProvider supplies the derived streak counts (current/longest
// days plus last-active timestamp). In production this is the profile repo;
// in tests it's mocked directly.
type StreakStatsProvider interface {
	GetStreakStats(ctx context.Context, userID uuid.UUID) (StreakStats, error)
}

// StreakStats is the derived view from activity tables.
type StreakStats struct {
	CurrentDays  int32
	LongestDays  int32
	LastActiveAt *time.Time
}

//go:generate mockery --case underscore --name Wallet --with-expecter --output mocks

// Wallet debits gold for shield purchases.
type Wallet interface {
	DebitGold(ctx context.Context, userID uuid.UUID, amount int32) error
}

// ShieldRow mirrors a user_streak_shields row.
type ShieldRow struct {
	UserID           uuid.UUID
	OwnedCount       int32
	LastUsedAt       *time.Time
	LastRestoredTo   *int32
	TotalPurchased   int32
	TotalUsed        int32
}

// Clock is mockable "now" for tests.
type Clock interface{ Now() time.Time }
type systemClock struct{}

func (systemClock) Now() time.Time { return time.Now().UTC() }

// Config bundles dependencies.
type Config struct {
	Repository Repository
	Stats      StreakStatsProvider
	Wallet     Wallet
	Clock      Clock
}

// Service exposes streak-shield operations.
type Service struct {
	repo   Repository
	stats  StreakStatsProvider
	wallet Wallet
	clock  Clock
}

// NewService constructs a Service.
func NewService(c Config) *Service {
	clock := c.Clock
	if clock == nil {
		clock = systemClock{}
	}
	return &Service{repo: c.Repository, stats: c.Stats, wallet: c.Wallet, clock: clock}
}

// Domain errors.
var (
	ErrStreakNotBroken = errors.New("streak: streak is not broken")
	ErrNoShieldsOwned  = errors.New("streak: no shields owned")
	ErrRestoreWindow   = errors.New("streak: restore window has expired")
	ErrInvalidCount    = errors.New("streak: invalid purchase count")
	ErrInsufficientGold = errors.New("streak: insufficient gold")
)

// GetStreak assembles the unified view of streak + shields.
func (s *Service) GetStreak(ctx context.Context, userID uuid.UUID) (*model.StreakState, error) {
	stats, err := s.stats.GetStreakStats(ctx, userID)
	if err != nil {
		return nil, err
	}
	row, err := s.repo.GetOrCreate(ctx, userID)
	if err != nil {
		return nil, err
	}
	return s.compose(stats, row), nil
}

// UseShield consumes one shield to restore a broken streak. The service
// does NOT directly modify the raw streak — the "restored" status is
// recorded in user_streak_shields (last_used_at + last_restored_to), and
// the profile progress layer takes that into account when computing the
// derived streak count on the next read. In this iteration we simulate
// that by returning the pre-break current-days value to the caller.
func (s *Service) UseShield(ctx context.Context, userID uuid.UUID) (*model.StreakState, int32, error) {
	stats, err := s.stats.GetStreakStats(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	row, err := s.repo.GetOrCreate(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	now := s.clock.Now()

	if !s.isBroken(stats, now) {
		return nil, 0, ErrStreakNotBroken
	}
	if !s.inRestoreWindow(stats, now) {
		return nil, 0, ErrRestoreWindow
	}
	if row.OwnedCount <= 0 {
		return nil, 0, ErrNoShieldsOwned
	}

	// Restore to the pre-break value; raw stats.CurrentDays will still be 0
	// until the activity layer picks up the restored flag. For the response
	// we use longest_days as the best-guess pre-break number, or 1 as a
	// floor.
	restoredTo := stats.LongestDays
	if restoredTo <= 0 {
		restoredTo = 1
	}
	if err := s.repo.UseShield(ctx, userID, restoredTo); err != nil {
		return nil, 0, err
	}

	// Re-read state for a consistent return.
	row, err = s.repo.GetOrCreate(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	state := s.compose(stats, row)
	// Reflect the restoration optimistically so the UI can update without a
	// second round-trip waiting for activity stats to recompute.
	state.CurrentDays = restoredTo
	state.IsBroken = false
	state.CanRestore = false
	return state, restoredTo, nil
}

// PurchaseShield increments the owned count. Count must be 1..5.
func (s *Service) PurchaseShield(ctx context.Context, userID uuid.UUID, count int32) (*model.StreakState, int32, int32, error) {
	if count <= 0 {
		count = 1
	}
	if count > MaxPurchasePerCall {
		return nil, 0, 0, ErrInvalidCount
	}
	totalCost := ShieldPriceGold * count

	if s.wallet != nil {
		if err := s.wallet.DebitGold(ctx, userID, totalCost); err != nil {
			return nil, 0, 0, err
		}
	}
	if err := s.repo.AddShields(ctx, userID, count); err != nil {
		return nil, 0, 0, err
	}

	stats, err := s.stats.GetStreakStats(ctx, userID)
	if err != nil {
		return nil, 0, 0, err
	}
	row, err := s.repo.GetOrCreate(ctx, userID)
	if err != nil {
		return nil, 0, 0, err
	}
	return s.compose(stats, row), count, totalCost, nil
}

// ---------- pure helpers ----------

// isBroken: streak is broken if the last activity was more than 24h ago.
func (s *Service) isBroken(stats StreakStats, now time.Time) bool {
	if stats.LastActiveAt == nil {
		return false
	}
	return now.Sub(*stats.LastActiveAt) >= 24*time.Hour
}

// inRestoreWindow: a shield can only restore if the break happened within
// RestoreWindow (36h). Past that, shields are useless.
func (s *Service) inRestoreWindow(stats StreakStats, now time.Time) bool {
	if stats.LastActiveAt == nil {
		return false
	}
	return now.Sub(*stats.LastActiveAt) < RestoreWindow
}

func (s *Service) compose(stats StreakStats, row *ShieldRow) *model.StreakState {
	now := s.clock.Now()
	broken := s.isBroken(stats, now)
	canRestore := broken && s.inRestoreWindow(stats, now) && row.OwnedCount > 0
	return &model.StreakState{
		CurrentDays:      stats.CurrentDays,
		LongestDays:      stats.LongestDays,
		ShieldsOwned:     row.OwnedCount,
		IsBroken:         broken,
		CanRestore:       canRestore,
		LastActiveAt:     stats.LastActiveAt,
		LastShieldUsedAt: row.LastUsedAt,
		ShieldPriceGold:  ShieldPriceGold,
	}
}
