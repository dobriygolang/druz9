package realtime

import (
	"time"

	schema "api/internal/realtime/schema"
)

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
			if c.authenticatedUserID != "" {
				c.userID = c.authenticatedUserID
			} else {
				c.userID = msg.UserID
			}
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
	if c.closed.Load() {
		return
	}
	select {
	case c.send <- msg:
	default:
	}
}

func (c *arenaClient) closeSend() {
	c.closeOnce.Do(func() {
		c.closed.Store(true)
		close(c.send)
	})
}
