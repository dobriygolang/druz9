package realtime

import (
	"time"

	schema "api/internal/realtime/schema"
)

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
