package realtime

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	codeeditordomain "api/internal/domain/codeeditor"
	schema "api/internal/realtime/schema"

	"github.com/gorilla/websocket"
)

type CodeEditorHub struct {
	store  codeeditordomain.Repository
	ctx    context.Context
	cancel context.CancelFunc

	mu    sync.Mutex
	rooms map[string]*codeEditorRoom
}

type codeEditorRoom struct {
	clients         map[*codeEditorClient]struct{}
	lastPlainText   string
	awarenessByID   map[uint64]schema.CodeEditorMessage
	dirty           bool
	initializedFrom bool
	creatorID       string
}

type codeEditorClient struct {
	roomID      string
	clientID    string
	awarenessID uint64
	userID      string
	ws          *websocket.Conn
	send        chan schema.CodeEditorMessage
}

var codeEditorUpgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func NewCodeEditorHub(store codeeditordomain.Repository) *CodeEditorHub {
	ctx, cancel := context.WithCancel(context.Background())
	hub := &CodeEditorHub{
		store:  store,
		ctx:    ctx,
		cancel: cancel,
		rooms:  make(map[string]*codeEditorRoom),
	}
	go hub.snapshotLoop()
	return hub
}

// Stop shuts down the hub's background goroutine.
func (h *CodeEditorHub) Stop() {
	h.cancel()
}

func (h *CodeEditorHub) Handler(roomID string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ws, err := codeEditorUpgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		client := &codeEditorClient{
			roomID: roomID,
			ws:     ws,
			send:   make(chan schema.CodeEditorMessage, 128),
		}

		h.addClient(client)
		defer h.removeClient(client)

		go client.writeLoop()
		client.readLoop(h)
	})
}

func EncodeMessage(msg schema.CodeEditorMessage) []byte {
	payload, err := json.Marshal(msg)
	if err != nil {
		panic(fmt.Sprintf("EncodeMessage: failed to marshal CodeEditorMessage: %v", err))
	}
	return payload
}
