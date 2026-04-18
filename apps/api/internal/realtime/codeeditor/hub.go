package codeeditor

import (
	"context"
	"net/http"
	"strings"
	"sync"
	"time"

	codeeditordomain "api/internal/domain/codeeditor"
	"api/internal/model"
	schema "api/internal/realtime/schema"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type codeEditorStateService interface {
	GetRoom(ctx context.Context, roomID uuid.UUID) (*codeeditordomain.Room, error)
	GetEditorState(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string) (*codeeditordomain.RoomEditorState, error)
	SaveEditorState(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, code string, language model.ProgrammingLanguage) error
	SetEditorLanguage(ctx context.Context, roomID uuid.UUID, userID *uuid.UUID, guestName string, language model.ProgrammingLanguage) (*codeeditordomain.RoomEditorState, error)
}

type Hub struct {
	store    codeEditorStateService
	upgrader websocket.Upgrader

	mu     sync.Mutex
	rooms  map[string]*codeEditorRoom
	stopCh chan struct{}
	ctx    context.Context
	cancel context.CancelFunc
}

type codeEditorRoom struct {
	clients         map[*codeEditorClient]struct{}
	mode            string
	language        string
	defaultCode     string
	lastPlainText   string
	awarenessByID   map[uint64]schema.CodeEditorMessage
	duelStates      map[string]*codeEditorEditorState
	dirty           bool
	initializedFrom bool
	creatorID       string
}

type codeEditorEditorState struct {
	plainText   string
	language    string
	dirty       bool
	initialized bool
}

type codeEditorClient struct {
	roomID              string
	clientID            string
	awarenessID         uint64
	authenticatedUserID string
	userID              string
	guestName           string
	actorKey            string
	roomMode            string
	authorized          bool
	ws                  *websocket.Conn
	send                chan schema.CodeEditorMessage
	closeOnce           sync.Once
}

func NewHub(store codeEditorStateService, allowedOrigins []string) *Hub {
	ctx, cancel := context.WithCancel(context.Background())
	hub := &Hub{
		store: store,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  4096,
			WriteBufferSize: 4096,
			CheckOrigin:     originChecker(allowedOrigins),
		},
		rooms:  make(map[string]*codeEditorRoom),
		stopCh: make(chan struct{}),
		ctx:    ctx,
		cancel: cancel,
	}
	go hub.snapshotLoop()
	return hub
}

// Stop gracefully shuts down the snapshot loop and cancels in-flight DB operations.
func (h *Hub) Stop() {
	close(h.stopCh)
	h.cancel()
}

func (h *Hub) Handler(roomID string, authenticatedUserID string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ws, err := h.upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		client := &codeEditorClient{
			roomID:              roomID,
			authenticatedUserID: authenticatedUserID,
			ws:                  ws,
			send:                make(chan schema.CodeEditorMessage, 128),
		}

		defer h.removeClient(client)

		go client.writeLoop()
		client.readLoop(h)
	})
}

func (h *Hub) authorizeClient(client *codeEditorClient) bool {
	if client == nil || (client.userID == "" && client.guestName == "") {
		return false
	}

	parsedRoomID, err := uuid.Parse(client.roomID)
	if err != nil {
		return false
	}

	ctx, cancel := context.WithTimeout(h.ctx, 5*time.Second)
	defer cancel()

	room, err := h.store.GetRoom(ctx, parsedRoomID)
	if err != nil || room == nil {
		return false
	}

	client.roomMode = room.Mode.String()
	client.actorKey = codeEditorActorKey(client.userID, client.guestName)

	return codeEditorActorAllowed(room, client.userID, client.guestName)
}

func codeEditorActorAllowed(room *codeeditordomain.Room, userID string, guestName string) bool {
	if room == nil {
		return false
	}

	if userID != "" {
		if room.CreatorID.String() == userID {
			return true
		}
		for _, participant := range room.Participants {
			if participant != nil && participant.UserID != nil && participant.UserID.String() == userID {
				return true
			}
		}
		return false
	}

	for _, participant := range room.Participants {
		if participant != nil && participant.IsGuest && strings.EqualFold(strings.TrimSpace(participant.Name), strings.TrimSpace(guestName)) {
			return true
		}
	}
	return false
}

func codeEditorActorKey(userID string, guestName string) string {
	if trimmedUserID := strings.TrimSpace(userID); trimmedUserID != "" {
		return "user:" + trimmedUserID
	}
	trimmedGuest := strings.TrimSpace(strings.ToLower(guestName))
	if trimmedGuest == "" {
		return ""
	}
	return "guest:" + trimmedGuest
}
