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
	matchID   string
	userID    string
	spectator bool
	ws        *websocket.Conn
	send      chan schema.ArenaMessage
}

var arenaUpgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func NewArenaHub(service arenaStateService) *ArenaHub {
	hub := &ArenaHub{
		service: service,
		matches: make(map[string]*arenaMatchRoom),
	}
	go hub.snapshotLoop()
	return hub
}

func (h *ArenaHub) Handler(matchID string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ws, err := arenaUpgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		client := &arenaClient{
			matchID: matchID,
			ws:      ws,
			send:    make(chan schema.ArenaMessage, 64),
		}

		h.addClient(client)
		defer h.removeClient(client)

		go client.writeLoop()
		client.readLoop(h)
	})
}

func (c *arenaClient) writeLoop() {
	for msg := range c.send {
		_ = c.ws.SetWriteDeadline(time.Now().Add(10 * time.Second))
		if err := c.ws.WriteJSON(msg); err != nil {
			return
		}
	}
}

func (c *arenaClient) readLoop(h *ArenaHub) {
	c.ws.SetReadLimit(1 << 20)
	_ = c.ws.SetReadDeadline(time.Now().Add(90 * time.Second))
	c.ws.SetPongHandler(func(string) error {
		return c.ws.SetReadDeadline(time.Now().Add(90 * time.Second))
	})

	for {
		var msg schema.ArenaMessage
		if err := c.ws.ReadJSON(&msg); err != nil {
			return
		}

		switch msg.Type {
		case schema.ArenaTypeHello:
			c.userID = msg.UserID
			c.spectator = msg.Spectator
			if msg.DisplayName != "" {
				h.bindDisplayName(c.matchID, c.userID, msg.DisplayName)
			}
			h.sendSnapshot(c)
		case schema.ArenaTypeCodeUpdate:
			if c.userID == "" {
				continue
			}
			h.handleCodeUpdate(c, msg)
		case schema.ArenaTypePing:
			c.enqueue(schema.ArenaMessage{Type: schema.ArenaTypePong})
		}
	}
}

func (c *arenaClient) enqueue(msg schema.ArenaMessage) {
	select {
	case c.send <- msg:
	default:
	}
}

func (h *ArenaHub) addClient(client *arenaClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.matches[client.matchID]
	if room == nil {
		room = &arenaMatchRoom{
			clients: make(map[*arenaClient]struct{}),
			codes:   make(map[string]*schema.ArenaPlayerCode),
		}
		h.matches[client.matchID] = room
	}
	room.clients[client] = struct{}{}
}

func (h *ArenaHub) removeClient(client *arenaClient) {
	var pending map[string]*schema.ArenaPlayerCode

	h.mu.Lock()
	room := h.matches[client.matchID]
	if room != nil {
		if room.dirty {
			pending = cloneArenaCodes(room.codes)
			room.dirty = false
		}
		delete(room.clients, client)
		if len(room.clients) == 0 {
			delete(h.matches, client.matchID)
		}
	}
	h.mu.Unlock()

	if len(pending) > 0 {
		h.flushSnapshot(client.matchID, pending)
	}

	close(client.send)
	_ = client.ws.Close()
}

func (h *ArenaHub) sendSnapshot(client *arenaClient) {
	h.ensureMatchLoaded(client.matchID)

	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.matches[client.matchID]
	if room == nil {
		return
	}

	client.enqueue(schema.ArenaMessage{
		Type:    schema.ArenaTypeSnapshot,
		Match:   room.match,
		Players: h.viewerCodesLocked(room, client.userID, client.spectator),
	})
}

func (h *ArenaHub) handleCodeUpdate(client *arenaClient, msg schema.ArenaMessage) {
	h.mu.Lock()
	room := h.matches[client.matchID]
	if room == nil {
		h.mu.Unlock()
		return
	}

	code := schema.ArenaPlayerCode{
		UserID: client.userID,
		Code:   msg.Code,
		IsSelf: true,
	}
	if existing := room.codes[client.userID]; existing != nil {
		code.DisplayName = existing.DisplayName
	}
	room.codes[client.userID] = &code
	room.dirty = true

	targets := make([]*arenaClient, 0, len(room.clients))
	for other := range room.clients {
		targets = append(targets, other)
	}
	match := room.match
	h.mu.Unlock()

	for _, other := range targets {
		other.enqueue(schema.ArenaMessage{
			Type:      schema.ArenaTypeCodeUpdate,
			UserID:    client.userID,
			Code:      h.viewerCode(match, &code, other.userID, other.spectator),
			UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano),
		})
	}
}

func (h *ArenaHub) PublishMatch(match *schema.ArenaMatch, codes []*schema.ArenaPlayerCode) {
	if match == nil || match.ID == "" {
		return
	}

	h.mu.Lock()
	room := h.matches[match.ID]
	if room == nil {
		room = &arenaMatchRoom{
			clients: make(map[*arenaClient]struct{}),
			codes:   make(map[string]*schema.ArenaPlayerCode),
		}
		h.matches[match.ID] = room
	}
	room.match = match
	for _, item := range codes {
		if item == nil || item.UserID == "" {
			continue
		}
		cloned := *item
		room.codes[item.UserID] = &cloned
	}
	room.dirty = false

	targets := make([]*arenaClient, 0, len(room.clients))
	for client := range room.clients {
		targets = append(targets, client)
	}
	h.mu.Unlock()

	for _, client := range targets {
		client.enqueue(schema.ArenaMessage{
			Type:    schema.ArenaTypeMatch,
			Match:   match,
			Players: h.viewerCodes(match, match.ID, client.userID, client.spectator),
		})
	}
}

func (h *ArenaHub) viewerCodes(match *schema.ArenaMatch, matchID, viewerUserID string, spectator bool) []*schema.ArenaPlayerCode {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.matches[matchID]
	if room == nil {
		return nil
	}
	return h.viewerCodesLocked(room, viewerUserID, spectator)
}

func (h *ArenaHub) viewerCodesLocked(room *arenaMatchRoom, viewerUserID string, spectator bool) []*schema.ArenaPlayerCode {
	result := make([]*schema.ArenaPlayerCode, 0, len(room.codes))
	for _, item := range room.codes {
		if item == nil {
			continue
		}
		result = append(result, &schema.ArenaPlayerCode{
			UserID:      item.UserID,
			DisplayName: item.DisplayName,
			Code:        h.viewerCode(room.match, item, viewerUserID, spectator),
			IsSelf:      item.UserID == viewerUserID,
		})
	}
	return result
}

func (h *ArenaHub) viewerCode(match *schema.ArenaMatch, item *schema.ArenaPlayerCode, viewerUserID string, spectator bool) string {
	if item == nil {
		return ""
	}
	if item.UserID == viewerUserID {
		return item.Code
	}
	if match != nil && match.Status == model.ArenaMatchStatusFinished.String() {
		return item.Code
	}
	if spectator {
		return item.Code
	}
	if match == nil || !match.ObfuscateOpponent {
		return item.Code
	}
	return obfuscateCode(item.Code)
}

func (h *ArenaHub) bindDisplayName(matchID, userID, displayName string) {
	if matchID == "" || userID == "" || displayName == "" {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.matches[matchID]
	if room == nil {
		return
	}
	if room.match != nil {
		for _, player := range room.match.Players {
			if player != nil && player.UserID == userID && player.DisplayName == "" {
				player.DisplayName = displayName
			}
		}
	}
	if code := room.codes[userID]; code != nil && code.DisplayName == "" {
		code.DisplayName = displayName
	}
}

func (h *ArenaHub) ensureMatchLoaded(matchID string) {
	if h.service == nil {
		return
	}

	h.mu.Lock()
	room := h.matches[matchID]
	alreadyLoaded := room != nil && room.match != nil
	h.mu.Unlock()
	if alreadyLoaded {
		return
	}

	parsedMatchID, err := uuid.Parse(matchID)
	if err != nil {
		return
	}
	match, err := h.service.GetMatch(context.Background(), parsedMatchID)
	if err != nil || match == nil {
		return
	}
	h.PublishMatch(dtoFromArenaMatch(match), dtoCodesFromArenaMatch(match))
}

func dtoFromArenaMatch(match *model.ArenaMatch) *schema.ArenaMatch {
	if match == nil {
		return nil
	}
	item := &schema.ArenaMatch{
		ID:                match.ID.String(),
		TaskID:            match.TaskID.String(),
		TaskTitle:         arenaTaskTitle(match),
		TaskStatement:     arenaTaskStatement(match),
		StarterCode:       arenaStarterCode(match),
		Topic:             match.Topic,
		Difficulty:        match.Difficulty.String(),
		Status:            match.Status.String(),
		DurationSeconds:   match.DurationSeconds,
		ObfuscateOpponent: match.ObfuscateOpponent,
		WinnerReason:      match.WinnerReason.String(),
		CreatedAt:         match.CreatedAt.UTC().Format(time.RFC3339Nano),
		Players:           make([]*schema.ArenaPlayer, 0, len(match.Players)),
	}
	if match.WinnerUserID != nil {
		item.WinnerUserID = match.WinnerUserID.String()
	}
	if match.StartedAt != nil && !match.StartedAt.IsZero() {
		item.StartedAt = match.StartedAt.UTC().Format(time.RFC3339Nano)
	}
	if match.FinishedAt != nil && !match.FinishedAt.IsZero() {
		item.FinishedAt = match.FinishedAt.UTC().Format(time.RFC3339Nano)
	}
	for _, player := range match.Players {
		if player == nil {
			continue
		}
		realtimePlayer := &schema.ArenaPlayer{
			UserID:        player.UserID.String(),
			DisplayName:   player.DisplayName,
			Side:          player.Side.String(),
			IsCreator:     player.IsCreator,
			BestRuntimeMs: player.BestRuntimeMs,
			IsWinner:      player.IsWinner,
			JoinedAt:      player.JoinedAt.UTC().Format(time.RFC3339Nano),
		}
		if player.FreezeUntil != nil && !player.FreezeUntil.IsZero() {
			realtimePlayer.FreezeUntil = player.FreezeUntil.UTC().Format(time.RFC3339Nano)
		}
		if player.AcceptedAt != nil && !player.AcceptedAt.IsZero() {
			realtimePlayer.AcceptedAt = player.AcceptedAt.UTC().Format(time.RFC3339Nano)
		}
		item.Players = append(item.Players, realtimePlayer)
	}
	return item
}

func arenaTaskTitle(match *model.ArenaMatch) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.Title
}

func arenaTaskStatement(match *model.ArenaMatch) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.Statement
}

func arenaStarterCode(match *model.ArenaMatch) string {
	if match == nil || match.Task == nil {
		return ""
	}
	return match.Task.StarterCode
}

func dtoCodesFromArenaMatch(match *model.ArenaMatch) []*schema.ArenaPlayerCode {
	if match == nil {
		return nil
	}
	result := make([]*schema.ArenaPlayerCode, 0, len(match.Players))
	for _, player := range match.Players {
		if player == nil {
			continue
		}
		result = append(result, &schema.ArenaPlayerCode{
			UserID:      player.UserID.String(),
			DisplayName: player.DisplayName,
			Code:        player.CurrentCode,
		})
	}
	return result
}

func cloneArenaCodes(source map[string]*schema.ArenaPlayerCode) map[string]*schema.ArenaPlayerCode {
	result := make(map[string]*schema.ArenaPlayerCode, len(source))
	for userID, code := range source {
		if code == nil {
			continue
		}
		item := *code
		result[userID] = &item
	}
	return result
}

func (h *ArenaHub) snapshotLoop() {
	ticker := time.NewTicker(arenaSnapshotFlushInterval)
	defer ticker.Stop()

	for range ticker.C {
		type snapshot struct {
			matchID string
			codes   map[string]*schema.ArenaPlayerCode
		}

		var pending []snapshot

		h.mu.Lock()
		for matchID, room := range h.matches {
			if !room.dirty {
				continue
			}
			pending = append(pending, snapshot{
				matchID: matchID,
				codes:   cloneArenaCodes(room.codes),
			})
			room.dirty = false
		}
		h.mu.Unlock()

		for _, item := range pending {
			h.flushSnapshot(item.matchID, item.codes)
		}
	}
}

func (h *ArenaHub) flushSnapshot(matchID string, codes map[string]*schema.ArenaPlayerCode) {
	if h.service == nil {
		return
	}
	parsedMatchID, err := uuid.Parse(matchID)
	if err != nil {
		return
	}

	// Batch all codes in single DB call (O(1) instead of N calls)
	codesMap := make(map[uuid.UUID]string, len(codes))
	for userID, code := range codes {
		if code == nil {
			continue
		}
		parsedUserID, parseErr := uuid.Parse(userID)
		if parseErr != nil {
			continue
		}
		codesMap[parsedUserID] = code.Code
	}

	if len(codesMap) > 0 {
		_ = h.service.SavePlayerCodes(context.Background(), parsedMatchID, codesMap)
	}
}

func obfuscateCode(value string) string {
	runes := []rune(value)
	for i, r := range runes {
		switch {
		case r == '\n' || r == '\r' || r == '\t' || r == ' ':
			continue
		default:
			runes[i] = '•'
		}
	}
	return string(runes)
}
