package codeeditor

import (
	"strings"
	"time"

	schema "api/internal/realtime/schema"

	"github.com/gorilla/websocket"
)

const codeEditorEnqueueTimeout = 100 * time.Millisecond

func (c *codeEditorClient) writeLoop() {
	defer func() {
		_ = recover()
		_ = c.ws.Close()
	}()
	for msg := range c.send {
		_ = c.ws.SetWriteDeadline(time.Now().Add(10 * time.Second))
		if err := c.ws.WriteJSON(msg); err != nil {
			return
		}
	}
}

func (c *codeEditorClient) readLoop(h *Hub) {
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
			if c.authorized {
				continue
			}
			c.clientID = msg.ClientID
			c.awarenessID = msg.AwarenessID
			if c.authenticatedUserID != "" {
				c.userID = c.authenticatedUserID
			} else {
				c.userID = strings.TrimSpace(msg.UserID)
			}
			c.guestName = strings.TrimSpace(msg.GuestName)
			if !h.authorizeClient(c) {
				_ = c.ws.WriteControl(
					websocket.CloseMessage,
					websocket.FormatCloseMessage(websocket.ClosePolicyViolation, "room access denied"),
					time.Now().Add(time.Second),
				)
				return
			}
			c.authorized = true
			h.addClient(c)
			h.sendSnapshot(c)
			h.sendAwarenessSnapshot(c)
		case schema.CodeEditorTypeDocSync:
			if !c.authorized {
				continue
			}
			if c.roomMode == "duel" {
				continue
			}
			h.broadcast(c.roomID, msg, c)
		case schema.CodeEditorTypeUpdate:
			if !c.authorized {
				continue
			}
			h.handleUpdate(c, msg)
		case schema.CodeEditorTypePersist:
			if !c.authorized {
				continue
			}
			h.handlePersist(c, msg)
		case schema.CodeEditorTypeLanguage:
			if !c.authorized {
				continue
			}
			h.handleLanguageChange(c, msg)
		case schema.CodeEditorTypeAwareness:
			if !c.authorized {
				continue
			}
			h.handleAwareness(c, msg)
		case schema.CodeEditorTypePing:
			_ = c.enqueue(schema.CodeEditorMessage{Type: schema.CodeEditorTypePong})
		}
	}
}

func (c *codeEditorClient) enqueue(msg schema.CodeEditorMessage) (ok bool) {
	defer func() {
		if recover() != nil {
			ok = false
		}
	}()

	timer := time.NewTimer(codeEditorEnqueueTimeout)
	defer timer.Stop()

	select {
	case c.send <- msg:
		return true
	case <-timer.C:
		return false
	}
}
