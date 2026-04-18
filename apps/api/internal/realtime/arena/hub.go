package arena

import (
	"context"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	domain "api/internal/domain/arena"
	"api/internal/model"
	schema "api/internal/realtime/schema"
)

const arenaSnapshotFlushInterval = 2 * time.Second

type Hub struct {
	service  arenaStateService
	upgrader websocket.Upgrader
	mu       sync.Mutex
	matches  map[string]*arenaMatchRoom
	stopCh   chan struct{}
	ctx      context.Context
	cancel   context.CancelFunc
}

type arenaStateService interface {
	GetMatch(ctx context.Context, matchID uuid.UUID) (*domain.Match, error)
	SavePlayerCode(ctx context.Context, matchID uuid.UUID, user *model.User, code string) error
	SavePlayerCodes(ctx context.Context, matchID uuid.UUID, codes map[uuid.UUID]string) error
}

type arenaMatchRoom struct {
	clients map[*arenaClient]struct{}
	codes   map[string]*schema.ArenaPlayerCode
	match   *schema.ArenaMatch
	dirty   bool
}

type arenaClient struct {
	matchID             string
	authenticatedUserID string
	userID              string
	spectator           bool
	ws                  *websocket.Conn
	send                chan schema.ArenaMessage
	closeOnce           sync.Once
	closed              atomic.Bool
}

func NewHub(service arenaStateService, allowedOrigins []string) *Hub {
	ctx, cancel := context.WithCancel(context.Background())
	hub := &Hub{
		service: service,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  4096,
			WriteBufferSize: 4096,
			CheckOrigin:     originChecker(allowedOrigins),
		},
		matches: make(map[string]*arenaMatchRoom),
		stopCh:  make(chan struct{}),
		ctx:     ctx,
		cancel:  cancel,
	}
	go hub.snapshotLoop()
	return hub
}

// Stop gracefully shuts down the snapshot loop and cancels in-flight DB operations.
func (h *Hub) Stop() {
	close(h.stopCh)
	h.cancel()
}

func (h *Hub) Handler(matchID string, authenticatedUserID string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ws, err := h.upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		client := &arenaClient{
			matchID:             matchID,
			authenticatedUserID: authenticatedUserID,
			ws:                  ws,
			send:                make(chan schema.ArenaMessage, 64),
		}

		h.addClient(client)
		defer h.removeClient(client)

		go client.writeLoop()
		client.readLoop(h)
	})
}
