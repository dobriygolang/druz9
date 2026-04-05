package arena

import (
	"context"
	"sync"
	"time"

	domain "api/internal/domain/arena"
	"api/internal/realtime/schema"
	"api/internal/sandbox"
)

type Sandbox interface {
	Execute(ctx context.Context, req sandbox.ExecutionRequest) (sandbox.ExecutionResult, error)
}

// RealtimePublisher interface for publishing match updates via WebSocket.
type RealtimePublisher interface {
	PublishMatch(match *schema.ArenaMatch, codes []*schema.ArenaPlayerCode)
}

type Config struct {
	Repository       domain.Repository
	Sandbox          Sandbox
	Realtime         RealtimePublisher
	AllowGuestAccess func() bool
	AntiCheatEnabled func() bool
}

type leaderboardSnapshot struct {
	entries   []*domain.LeaderboardEntry
	expiresAt time.Time
}

type Service struct {
	repo             domain.Repository
	sandbox          Sandbox
	realtime         RealtimePublisher
	allowGuestAccess func() bool
	antiCheatEnabled func() bool

	leaderboardMu    sync.Mutex
	leaderboardCache leaderboardSnapshot
}

const leaderboardCacheTTL = 30 * time.Second

func New(c Config) *Service {
	allowGuestAccess := c.AllowGuestAccess
	if allowGuestAccess == nil {
		allowGuestAccess = func() bool { return false }
	}
	antiCheatEnabled := c.AntiCheatEnabled
	if antiCheatEnabled == nil {
		antiCheatEnabled = func() bool { return true }
	}
	return &Service{
		repo:             c.Repository,
		sandbox:          c.Sandbox,
		realtime:         c.Realtime,
		allowGuestAccess: allowGuestAccess,
		antiCheatEnabled: antiCheatEnabled,
	}
}
