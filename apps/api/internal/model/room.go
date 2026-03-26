package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	RoomKindVoice      = "voice"
	RoomKindWatchParty = "watch_party"
)

type Room struct {
	ID           uuid.UUID
	Title        string
	Kind         string
	Description  string
	IsPrivate    bool
	CreatorID    string
	CreatorName  string
	MemberCount  int32
	IsJoined     bool
	IsOwner      bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Participants []*RoomParticipant
	MediaState   *RoomMediaState
}

type RoomParticipant struct {
	UserID           string
	Title            string
	AvatarURL        string
	TelegramUsername string
	FirstName        string
	LastName         string
	IsCurrentUser    bool
	JoinedAt         time.Time
}

type RoomMediaState struct {
	RoomID             string
	MediaURL           string
	Paused             bool
	CurrentTimeSeconds int32
	UpdatedBy          string
	UpdatedByName      string
	UpdatedAt          time.Time
}

type CreateRoomRequest struct {
	Title       string
	Kind        string
	Description string
	IsPrivate   bool
	MediaURL    string
}

type UpdateRoomRequest struct {
	Title       string
	Description string
	IsPrivate   bool
	MediaURL    string
}

type UpsertRoomMediaStateRequest struct {
	MediaURL           string
	Paused             bool
	CurrentTimeSeconds int32
}

type ListRoomsOptions struct {
	Limit  int32
	Offset int32
	Kind   string // "voice" or "watch_party"
}

const (
	DefaultRoomsLimit = 20
	MaxRoomsLimit     = 100
)

type ListRoomsResponse struct {
	Rooms       []*Room
	Limit       int32
	Offset      int32
	TotalCount  int32
	HasNextPage bool
}

type RoomJoinCredentials struct {
	AccessToken string
	Provider    string
	ServerURL   string
}
