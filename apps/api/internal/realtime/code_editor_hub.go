package realtime

import (
	"encoding/json"
	"net/http"
	"sync"

	codeeditordomain "api/internal/domain/codeeditor"
	schema "api/internal/realtime/schema"

	"github.com/gorilla/websocket"
)

type CodeEditorHub struct {
	store codeeditordomain.Repository

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
	hub := &CodeEditorHub{
		store: store,
		rooms: make(map[string]*codeEditorRoom),
	}
	go hub.snapshotLoop()
	return hub
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
	payload, _ := json.Marshal(msg)
	return payload
}
