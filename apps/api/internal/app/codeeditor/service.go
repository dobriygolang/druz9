package codeeditor

import (
	"context"
	"sync"
	"time"

	"api/internal/cache"
	domain "api/internal/domain/codeeditor"
	"api/internal/sandbox"

	"github.com/google/uuid"
)

type Config struct {
	Repository domain.Repository
	Sandbox    Sandbox
}

type Sandbox interface {
	Execute(ctx context.Context, req sandbox.ExecutionRequest) (sandbox.ExecutionResult, error)
}

// GuestParticipant представляет гостя в комнате, хранимого в кэше
type GuestParticipant struct {
	RoomID   uuid.UUID
	Name     string
	IsGuest  bool
	IsReady  bool
	JoinedAt time.Time
}

// guestRoomKey генерирует ключ для хранения гостя в кэше
func guestRoomKey(roomID uuid.UUID, guestName string) string {
	return roomID.String() + ":" + guestName
}

type leaderboardSnapshot struct {
	entries   []*domain.LeaderboardEntry
	expiresAt time.Time
}

type Service struct {
	repo       domain.Repository
	sandbox    Sandbox
	taskCache  *cache.TTLCache[domain.Task]
	guestCache *cache.TTLCache[GuestParticipant]

	leaderboardMu    sync.Mutex
	leaderboardCache leaderboardSnapshot
}

const (
	guestTTL             = 10 * time.Minute
	guestCacheMaxEntries = 1000
	leaderboardCacheTTL  = 30 * time.Second
)

func New(c Config) *Service {
	return &Service{
		repo:       c.Repository,
		sandbox:    c.Sandbox,
		taskCache:  cache.NewTTLCache[domain.Task](100, 5*time.Minute),
		guestCache: cache.NewTTLCache[GuestParticipant](guestCacheMaxEntries, guestTTL),
	}
}
