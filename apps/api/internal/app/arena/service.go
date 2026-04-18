package arena

import (
	"context"
	"sync"
	"time"

	"github.com/google/uuid"

	domain "api/internal/domain/arena"
	"api/internal/model"
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

// SeasonPassAwarder is the narrow slice of season_pass/Service we need to
// credit XP when a match finishes. Optional — nil means no-op.
type SeasonPassAwarder interface {
	AddXP(ctx context.Context, userID uuid.UUID, delta int32) error
}

// DuelReplayRecorder is the narrow slice of duel_replay/Service we need
// to persist a replay header when a match finishes. Optional — nil means
// replays are not auto-created (the match still finishes cleanly).
type DuelReplayRecorder interface {
	CreateReplay(ctx context.Context, r *model.DuelReplaySummary) error
}

type Config struct {
	Repository       domain.Repository
	Sandbox          Sandbox
	Realtime         RealtimePublisher
	SeasonPass       SeasonPassAwarder
	DuelReplay       DuelReplayRecorder
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
	seasonPass       SeasonPassAwarder
	duelReplay       DuelReplayRecorder
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
		seasonPass:       c.SeasonPass,
		duelReplay:       c.DuelReplay,
		allowGuestAccess: allowGuestAccess,
		antiCheatEnabled: antiCheatEnabled,
	}
}
