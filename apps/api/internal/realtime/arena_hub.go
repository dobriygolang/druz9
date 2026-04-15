package realtime

import (
	"context"
	"net/http"
	"sync"
	"time"

	domain "api/internal/domain/arena"
	"api/internal/model"
	schema "api/internal/realtime/schema"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const arenaSnapshotFlushInterval = 2 * time.Second

type ArenaHub struct {
	service arenaStateService
	ctx     context.Context
	cancel  context.CancelFunc
	mu      sync.Mutex
	matches map[string]*arenaMatchRoom
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
}

var arenaUpgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func NewArenaHub(service arenaStateService) *ArenaHub {
	ctx, cancel := context.WithCancel(context.Background())
	hub := &ArenaHub{
		service: service,
		ctx:     ctx,
		cancel:  cancel,
		matches: make(map[string]*arenaMatchRoom),
	}
	go hub.snapshotLoop()
	return hub
}

// Stop shuts down the hub's background goroutine.
func (h *ArenaHub) Stop() {
	h.cancel()
}

func (h *ArenaHub) Handler(matchID string, authenticatedUserID string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ws, err := arenaUpgrader.Upgrade(w, r, nil)
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
