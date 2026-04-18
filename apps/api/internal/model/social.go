package model

import (
	"time"

	"github.com/google/uuid"
)

type PresenceStatus int32

const (
	PresenceStatusUnspecified PresenceStatus = 0
	PresenceStatusOnline      PresenceStatus = 1
	PresenceStatusAway        PresenceStatus = 2
	PresenceStatusOffline     PresenceStatus = 3
)

type FriendRequestStatus int16

const (
	FriendRequestStatusPending  FriendRequestStatus = 1
	FriendRequestStatusAccepted FriendRequestStatus = 2
	FriendRequestStatusDeclined FriendRequestStatus = 3
)

// Friend is one friendship row as seen by a specific viewer. "Favorite" and
// presence are derived per-viewer.
type Friend struct {
	UserID       uuid.UUID      `json:"userId"`
	Username     string         `json:"username"`
	DisplayName  string         `json:"displayName"`
	AvatarURL    string         `json:"avatarUrl"`
	GuildName    string         `json:"guildName"`
	Presence     PresenceStatus `json:"presence"`
	LastActivity string         `json:"lastActivity"`
	LastSeenAt   time.Time      `json:"lastSeenAt"`
	FriendsSince time.Time      `json:"friendsSince"`
	IsFavorite   bool           `json:"isFavorite"`
}

// FriendList is the paginated response for ListFriends.
type FriendList struct {
	Friends     []*Friend `json:"friends"`
	Total       int32     `json:"total"`
	OnlineCount int32     `json:"onlineCount"`
}

// FriendRequest is a directed row in the friend_requests table. "From" is
// always the sender; "to" is the recipient.
type FriendRequest struct {
	ID           uuid.UUID           `json:"id"`
	FromUserID   uuid.UUID           `json:"fromUserId"`
	FromUsername string              `json:"fromUsername"`
	ToUserID     uuid.UUID           `json:"toUserId"`
	Message      string              `json:"message"`
	Status       FriendRequestStatus `json:"status"`
	CreatedAt    time.Time           `json:"createdAt"`
}

// FriendRequestBuckets splits pending requests into the two directions the
// UI needs to render (incoming / outgoing).
type FriendRequestBuckets struct {
	Incoming []*FriendRequest `json:"incoming"`
	Outgoing []*FriendRequest `json:"outgoing"`
}
