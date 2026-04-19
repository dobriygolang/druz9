// Package guildwar provides a minimal WebSocket hub for live guild-war
// events (ADR-004): phase transitions, front contributions, mvp changes.
//
// Subscribers connect to /api/v1/realtime/guildwar/{warId}; producers
// (the cron worker, ContributeToFront handler) call hub.Publish. The hub
// keeps an in-memory subscriber set per warID — fine for single-instance
// deployments. Multi-pod deployments will need Redis pub/sub here.
package guildwar

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	klog "github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Event is the wire shape pushed to subscribers. Type discriminates
// the payload; clients can add new types defensively.
type Event struct {
	Type string         `json:"type"` // snapshot | phase_transition | front_contribution | mvp_changed | feed
	WarID uuid.UUID     `json:"warId"`
	At   time.Time      `json:"at"`
	Data map[string]any `json:"data,omitempty"`
}

type subscriber struct {
	ws    *websocket.Conn
	queue chan Event
}

type Hub struct {
	upgrader websocket.Upgrader
	log      *klog.Helper

	mu   sync.RWMutex
	subs map[uuid.UUID]map[*subscriber]struct{} // warID → subscriber set
}

func NewHub(logger klog.Logger, allowedOrigins []string) *Hub {
	allow := func(*http.Request) bool { return true }
	if len(allowedOrigins) > 0 {
		set := make(map[string]struct{}, len(allowedOrigins))
		for _, o := range allowedOrigins {
			set[o] = struct{}{}
		}
		allow = func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			_, ok := set[origin]
			return ok
		}
	}
	return &Hub{
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 4096,
			CheckOrigin:     allow,
		},
		log:  klog.NewHelper(logger),
		subs: make(map[uuid.UUID]map[*subscriber]struct{}),
	}
}

// Publish fans `ev` out to every subscriber of ev.WarID. Non-blocking:
// if a subscriber's queue is full, the event is dropped for that
// subscriber (slow client, will pick up the next event).
func (h *Hub) Publish(ev Event) {
	if ev.At.IsZero() {
		ev.At = time.Now().UTC()
	}
	h.mu.RLock()
	subs := h.subs[ev.WarID]
	for s := range subs {
		select {
		case s.queue <- ev:
		default:
			// drop — subscriber is too slow
		}
	}
	h.mu.RUnlock()
}

// Handler returns an http.Handler that upgrades the connection and
// streams events for `warID`. Auth is the caller's responsibility (gate
// the route in transport_auth before reaching the hub).
func (h *Hub) Handler(warID uuid.UUID) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := h.upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		sub := &subscriber{ws: conn, queue: make(chan Event, 32)}
		h.subscribe(warID, sub)
		defer h.unsubscribe(warID, sub)

		// Reader loop — discard messages; we don't expect input from
		// clients but we need to drain so the connection doesn't block.
		go func() {
			for {
				if _, _, err := conn.ReadMessage(); err != nil {
					return
				}
			}
		}()

		// Writer loop.
		for ev := range sub.queue {
			body, err := json.Marshal(ev)
			if err != nil {
				continue
			}
			_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			if err := conn.WriteMessage(websocket.TextMessage, body); err != nil {
				return
			}
		}
	})
}

func (h *Hub) subscribe(warID uuid.UUID, s *subscriber) {
	h.mu.Lock()
	if _, ok := h.subs[warID]; !ok {
		h.subs[warID] = make(map[*subscriber]struct{})
	}
	h.subs[warID][s] = struct{}{}
	h.mu.Unlock()
}

func (h *Hub) unsubscribe(warID uuid.UUID, s *subscriber) {
	h.mu.Lock()
	if set, ok := h.subs[warID]; ok {
		delete(set, s)
		if len(set) == 0 {
			delete(h.subs, warID)
		}
	}
	h.mu.Unlock()
	close(s.queue)
	_ = s.ws.Close()
}
