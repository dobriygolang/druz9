package arena

import (
	"time"

	"api/internal/model"
	schema "api/internal/realtime/schema"
)

func (h *Hub) addClient(client *arenaClient) {
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

func (h *Hub) removeClient(client *arenaClient) {
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

	client.closeSend()
	_ = client.ws.Close()
}

func (h *Hub) sendSnapshot(client *arenaClient) {
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

func (h *Hub) handleCodeUpdate(client *arenaClient, msg schema.ArenaMessage) {
	h.mu.Lock()
	room := h.matches[client.matchID]
	if room == nil {
		h.mu.Unlock()
		return
	}
	if !arenaUserCanEdit(room.match, client.userID, client.spectator) {
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
		codeValue, obfuscated := h.viewerCode(match, &code, other.userID, other.spectator)
		other.enqueue(schema.ArenaMessage{
			Type:       schema.ArenaTypeCodeUpdate,
			UserID:     client.userID,
			Code:       codeValue,
			Obfuscated: obfuscated,
			UpdatedAt:  time.Now().UTC().Format(time.RFC3339Nano),
		})
	}
}

func (h *Hub) PublishMatch(match *schema.ArenaMatch, codes []*schema.ArenaPlayerCode) {
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

func (h *Hub) viewerCodes(match *schema.ArenaMatch, matchID, viewerUserID string, spectator bool) []*schema.ArenaPlayerCode {
	h.mu.Lock()
	defer h.mu.Unlock()

	room := h.matches[matchID]
	if room == nil {
		return nil
	}
	return h.viewerCodesLocked(room, viewerUserID, spectator)
}

func (h *Hub) viewerCodesLocked(room *arenaMatchRoom, viewerUserID string, spectator bool) []*schema.ArenaPlayerCode {
	result := make([]*schema.ArenaPlayerCode, 0, len(room.codes))
	for _, item := range room.codes {
		if item == nil {
			continue
		}
		codeValue, obfuscated := h.viewerCode(room.match, item, viewerUserID, spectator)
		result = append(result, &schema.ArenaPlayerCode{
			UserID:      item.UserID,
			DisplayName: item.DisplayName,
			Code:        codeValue,
			IsSelf:      item.UserID == viewerUserID,
			Obfuscated:  obfuscated,
		})
	}
	return result
}

func (h *Hub) viewerCode(match *schema.ArenaMatch, item *schema.ArenaPlayerCode, viewerUserID string, spectator bool) (string, bool) {
	if item == nil {
		return "", false
	}
	if item.UserID == viewerUserID {
		return item.Code, false
	}
	if match != nil && match.Status == model.ArenaMatchStatusFinished.String() {
		return item.Code, false
	}
	if spectator || viewerUserID == "" {
		return "", true
	}
	return "", true
}

func (h *Hub) bindDisplayName(matchID, userID, displayName string) {
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

func arenaUserCanEdit(match *schema.ArenaMatch, userID string, spectator bool) bool {
	if spectator || userID == "" {
		return false
	}
	if match == nil {
		return false
	}
	for _, player := range match.Players {
		if player != nil && player.UserID == userID {
			return true
		}
	}
	return false
}
