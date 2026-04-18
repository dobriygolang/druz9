// Package streak implements the shield-protection layer on top of derived
// streak counts. Raw streak (current/longest) comes from the profile
// progress layer via the StreakStatsProvider interface; this package owns
// shield inventory and the restore/purchase flow.
package streak

import (
	"context"
	"time"

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
