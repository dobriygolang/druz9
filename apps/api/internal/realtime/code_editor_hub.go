package realtime

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	codeeditordomain "api/internal/domain/codeeditor"
	schema "api/internal/realtime/schema"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	snapshotFlushInterval = 3 * time.Second
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

func (c *codeEditorClient) writeLoop() {
	for msg := range c.send {
		_ = c.ws.SetWriteDeadline(time.Now().Add(10 * time.Second))
		if err := c.ws.WriteJSON(msg); err != nil {
			return
		}
	}
}

func (c *codeEditorClient) readLoop(h *CodeEditorHub) {
	c.ws.SetReadLimit(1 << 20)
	_ = c.ws.SetReadDeadline(time.Now().Add(90 * time.Second))
	c.ws.SetPongHandler(func(string) error {
		return c.ws.SetReadDeadline(time.Now().Add(90 * time.Second))
	})

	for {
		var msg schema.CodeEditorMessage
		if err := c.ws.ReadJSON(&msg); err != nil {
			return
		}

		switch msg.Type {
		case schema.CodeEditorTypeHello:
			c.clientID = msg.ClientID
			c.awarenessID = msg.AwarenessID
			c.userID = msg.UserID
			h.sendSnapshot(c)
			h.sendAwarenessSnapshot(c)
		case schema.CodeEditorTypeUpdate:
			h.handleUpdate(c, msg)
		case schema.CodeEditorTypeAwareness:
			h.handleAwareness(c, msg)
		case schema.CodeEditorTypePing:
			c.enqueue(schema.CodeEditorMessage{Type: schema.CodeEditorTypePong})
		}
	}
}

func (c *codeEditorClient) enqueue(msg schema.CodeEditorMessage) {
	select {
	case c.send <- msg:
	default:
	}
}

func (h *CodeEditorHub) addClient(client *codeEditorClient) {
	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room == nil {
		room = &codeEditorRoom{
			clients:       make(map[*codeEditorClient]struct{}),
			awarenessByID: make(map[uint64]schema.CodeEditorMessage),
		}
		h.rooms[client.roomID] = room
	}
	room.clients[client] = struct{}{}
	shouldInitialize := !room.initializedFrom
	room.initializedFrom = true
	h.mu.Unlock()

	if shouldInitialize {
		h.loadRoomSnapshot(client.roomID)
	}
}

func (h *CodeEditorHub) removeClient(client *codeEditorClient) {
	h.mu.Lock()
	room := h.rooms[client.roomID]
	isCreator := room != nil && room.creatorID != "" && client.userID == room.creatorID
	if room != nil {
		if room.dirty {
			h.flushSnapshot(client.roomID, room.lastPlainText)
			room.dirty = false
		}
		delete(room.clients, client)
		if client.awarenessID != 0 {
			delete(room.awarenessByID, client.awarenessID)
		}
		if len(room.clients) == 0 {
			delete(h.rooms, client.roomID)
		}
	}
	h.mu.Unlock()

	close(client.send)
	_ = client.ws.Close()

	// Don't broadcast awareness remove for the room creator
	if client.awarenessID != 0 && !isCreator {
		h.broadcast(client.roomID, schema.CodeEditorMessage{
			Type:         schema.CodeEditorTypeAwarenessRemove,
			AwarenessIDs: []uint64{client.awarenessID},
		}, client)
	}
}

func (h *CodeEditorHub) loadRoomSnapshot(roomID string) {
	parsedRoomID, err := uuid.Parse(roomID)
	if err != nil {
		return
	}

	room, err := h.store.GetRoom(context.Background(), parsedRoomID)
	if err != nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	state := h.rooms[roomID]
	if state == nil {
		return
	}
	state.lastPlainText = room.Code
	state.creatorID = room.CreatorID.String()
}

func (h *CodeEditorHub) sendSnapshot(client *codeEditorClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.rooms[client.roomID]
	if room == nil {
		return
	}

	client.enqueue(schema.CodeEditorMessage{
		Type:      schema.CodeEditorTypeSnapshot,
		PlainText: room.lastPlainText,
	})
}

func (h *CodeEditorHub) sendAwarenessSnapshot(client *codeEditorClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.rooms[client.roomID]
	if room == nil {
		return
	}

	for awarenessID, msg := range room.awarenessByID {
		if awarenessID == client.awarenessID {
			continue
		}
		client.enqueue(msg)
	}
}

func (h *CodeEditorHub) handleUpdate(client *codeEditorClient, msg schema.CodeEditorMessage) {
	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room != nil {
		room.lastPlainText = msg.PlainText
		room.dirty = true
	}
	h.mu.Unlock()

	h.broadcast(client.roomID, msg, client)
}

func (h *CodeEditorHub) handleAwareness(client *codeEditorClient, msg schema.CodeEditorMessage) {
	if msg.AwarenessID != 0 {
		client.awarenessID = msg.AwarenessID
	}

	h.mu.Lock()
	room := h.rooms[client.roomID]
	if room != nil && client.awarenessID != 0 && msg.Data != "" {
		room.awarenessByID[client.awarenessID] = msg
	}
	h.mu.Unlock()

	h.broadcast(client.roomID, msg, client)
}

func (h *CodeEditorHub) broadcast(roomID string, msg schema.CodeEditorMessage, sender *codeEditorClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.rooms[roomID]
	if room == nil {
		return
	}

	for client := range room.clients {
		if sender != nil && client == sender {
			continue
		}
		client.enqueue(msg)
	}
}

func (h *CodeEditorHub) snapshotLoop() {
	ticker := time.NewTicker(snapshotFlushInterval)
	defer ticker.Stop()

	for range ticker.C {
		type snapshot struct {
			roomID string
			code   string
		}

		var pending []snapshot

		h.mu.Lock()
		for roomID, room := range h.rooms {
			if !room.dirty {
				continue
			}
			pending = append(pending, snapshot{roomID: roomID, code: room.lastPlainText})
			room.dirty = false
		}
		h.mu.Unlock()

		for _, item := range pending {
			h.flushSnapshot(item.roomID, item.code)
		}
	}
}

func (h *CodeEditorHub) flushSnapshot(roomID, code string) {
	parsedRoomID, err := uuid.Parse(roomID)
	if err != nil {
		return
	}
	_ = h.store.SaveCodeSnapshot(context.Background(), parsedRoomID, code)
}

func (h *CodeEditorHub) PublishRoomUpdate(room *schema.CodeEditorRoom) {
	if room == nil || room.ID == "" {
		return
	}
	h.broadcast(room.ID, schema.CodeEditorMessage{
		Type: schema.CodeEditorTypeRoomUpdate,
		Room: room,
	}, nil)
}

func (h *CodeEditorHub) PublishSubmission(roomID string, submission *schema.CodeEditorSubmissionEvent) {
	if roomID == "" || submission == nil {
		return
	}
	h.broadcast(roomID, schema.CodeEditorMessage{
		Type:       schema.CodeEditorTypeSubmission,
		Submission: submission,
	}, nil)
}

func EncodeMessage(msg schema.CodeEditorMessage) []byte {
	payload, _ := json.Marshal(msg)
	return payload
}
