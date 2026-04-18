package model

import (
	"time"

	"github.com/google/uuid"
)

// ThreadKind classifies inbox threads. Mirrors the proto enum values.
type ThreadKind int32

const (
	ThreadKindUnspecified ThreadKind = 0
	ThreadKindMentor      ThreadKind = 1
	ThreadKindGuild       ThreadKind = 2
	ThreadKindSystem      ThreadKind = 3
	ThreadKindDuel        ThreadKind = 4
	ThreadKindChallenge   ThreadKind = 5
)

// IsInteractive reports whether user messages can be sent into this kind of thread.
// Only mentor, duel, and challenge threads accept replies; system and guild
// notices are one-way.
func (k ThreadKind) IsInteractive() bool {
	switch k {
	case ThreadKindMentor, ThreadKindDuel, ThreadKindChallenge:
		return true
	default:
		return false
	}
}

// SenderKind classifies who authored an inbox message.
type SenderKind int32

const (
	SenderKindUnspecified SenderKind = 0
	SenderKindUser        SenderKind = 1
	SenderKindSystem      SenderKind = 2
	SenderKindMentorBot   SenderKind = 3
	SenderKindGuildBot    SenderKind = 4
)

// InboxThread is a per-user conversation container.
type InboxThread struct {
	ID            uuid.UUID  `json:"id"`
	UserID        uuid.UUID  `json:"userId"`
	Kind          ThreadKind `json:"kind"`
	Subject       string     `json:"subject"`
	Avatar        string     `json:"avatar"`
	Preview       string     `json:"preview"`
	UnreadCount   int32      `json:"unreadCount"`
	LastMessageAt time.Time  `json:"lastMessageAt"`
	ExternalID    *uuid.UUID `json:"externalId,omitempty"`
	Interactive   bool       `json:"interactive"`
	CreatedAt     time.Time  `json:"createdAt"`
}

// InboxMessage is an individual entry within an InboxThread.
type InboxMessage struct {
	ID         uuid.UUID  `json:"id"`
	ThreadID   uuid.UUID  `json:"threadId"`
	SenderKind SenderKind `json:"senderKind"`
	SenderID   *uuid.UUID `json:"senderId,omitempty"`
	SenderName string     `json:"senderName"`
	Body       string     `json:"body"`
	Read       bool       `json:"read"`
	CreatedAt  time.Time  `json:"createdAt"`
}

// ThreadList is the paginated response for ListThreads.
type ThreadList struct {
	Threads     []*InboxThread `json:"threads"`
	Total       int32          `json:"total"`
	UnreadTotal int32          `json:"unreadTotal"`
}

// ThreadWithMessages bundles a thread with its ordered message list.
type ThreadWithMessages struct {
	Thread   *InboxThread    `json:"thread"`
	Messages []*InboxMessage `json:"messages"`
}
