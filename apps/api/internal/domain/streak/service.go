// Package streak implements the shield-protection layer on top of derived
// streak counts. Raw streak (current/longest) comes from the profile
// progress layer via the StreakStatsProvider interface; this package owns
// shield inventory and the restore/purchase flow.
package streak

import (
	"context"
	"errors"
	"fmt"
	"time"

	walletdomain "api/internal/domain/wallet"
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
	UserID         uuid.UUID
	OwnedCount     int32
	LastUsedAt     *time.Time
	LastRestoredTo *int32
	TotalPurchased int32
	TotalUsed      int32
}

// Clock is mockable "now" for tests.
type Clock interface{ Now() time.Time }
type systemClock struct{}

func (systemClock) Now() time.Time { return time.Now().UTC() }

var (
	ErrStreakNotBroken  = errors.New("streak: streak not broken")
	ErrNoShieldsOwned   = errors.New("streak: no shields owned")
	ErrRestoreWindow    = errors.New("streak: restore window expired")
	ErrInvalidCount     = errors.New("streak: invalid purchase count")
	ErrInsufficientGold = errors.New("streak: insufficient gold")
)

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

func (s *Service) GetStreak(ctx context.Context, userID uuid.UUID) (*model.StreakState, error) {
	row, err := s.repo.GetOrCreate(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("load streak shields: %w", err)
	}
	stats, err := s.stats.GetStreakStats(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("load streak stats: %w", err)
	}
	return s.buildState(stats, row), nil
}

func (s *Service) UseShield(ctx context.Context, userID uuid.UUID) (*model.StreakState, int32, error) {
	row, err := s.repo.GetOrCreate(ctx, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("load streak shields: %w", err)
	}
	stats, err := s.stats.GetStreakStats(ctx, userID)
	if err != nil {
		return nil, 0, fmt.Errorf("load streak stats: %w", err)
	}

	state := s.buildState(stats, row)
	if !state.IsBroken {
		return nil, 0, ErrStreakNotBroken
	}
	if !state.CanRestore {
		return nil, 0, ErrRestoreWindow
	}
	if row.OwnedCount <= 0 {
		return nil, 0, ErrNoShieldsOwned
	}

	restoredTo := stats.LongestDays
	if restoredTo <= 0 {
		restoredTo = 1
	}
	if err := s.repo.UseShield(ctx, userID, restoredTo); err != nil {
		return nil, 0, fmt.Errorf("use shield: %w", err)
	}

	now := s.clock.Now()
	row.OwnedCount--
	row.LastUsedAt = &now
	row.LastRestoredTo = &restoredTo
	stats.CurrentDays = restoredTo
	stats.LastActiveAt = &now
	if stats.LongestDays < restoredTo {
		stats.LongestDays = restoredTo
	}

	return s.buildState(stats, row), restoredTo, nil
}

func (s *Service) PurchaseShield(ctx context.Context, userID uuid.UUID, count int32) (*model.StreakState, int32, int32, error) {
	if count <= 0 || count > MaxPurchasePerCall {
		return nil, 0, 0, ErrInvalidCount
	}
	if s.wallet == nil {
		return nil, 0, 0, fmt.Errorf("purchase shield: wallet is nil")
	}
	if err := s.wallet.DebitGold(ctx, userID, ShieldPriceGold*count); err != nil {
		if errors.Is(err, walletdomain.ErrInsufficientFunds) || errors.Is(err, ErrInsufficientGold) || err.Error() == "insufficient funds" || containsInsufficientFunds(err) {
			return nil, 0, 0, ErrInsufficientGold
		}
		return nil, 0, 0, fmt.Errorf("debit gold: %w", err)
	}
	if err := s.repo.AddShields(ctx, userID, count); err != nil {
		return nil, 0, 0, fmt.Errorf("add shields: %w", err)
	}

	row, err := s.repo.GetOrCreate(ctx, userID)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("load streak shields: %w", err)
	}
	stats, err := s.stats.GetStreakStats(ctx, userID)
	if err != nil {
		return nil, 0, 0, fmt.Errorf("load streak stats: %w", err)
	}

	return s.buildState(stats, row), count, ShieldPriceGold * count, nil
}

func (s *Service) buildState(stats StreakStats, row *ShieldRow) *model.StreakState {
	state := &model.StreakState{
		CurrentDays:     stats.CurrentDays,
		LongestDays:     stats.LongestDays,
		LastActiveAt:    stats.LastActiveAt,
		ShieldPriceGold: ShieldPriceGold,
	}
	if row != nil {
		state.ShieldsOwned = row.OwnedCount
		state.LastShieldUsedAt = row.LastUsedAt
	}

	isBroken, canRestore := s.computeBreakState(stats.LastActiveAt)
	state.IsBroken = isBroken
	state.CanRestore = canRestore
	return state
}

func (s *Service) computeBreakState(lastActiveAt *time.Time) (bool, bool) {
	if lastActiveAt == nil {
		return false, false
	}
	gap := s.clock.Now().Sub(*lastActiveAt)
	if gap <= 24*time.Hour {
		return false, false
	}
	if gap <= RestoreWindow {
		return true, true
	}
	return true, false
}

func containsInsufficientFunds(err error) bool {
	return err != nil && (err.Error() == "insufficient funds" || err.Error() == "wallet: insufficient funds" || err.Error() == "insufficient funds: wallet: insufficient funds")
}
