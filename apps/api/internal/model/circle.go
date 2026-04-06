package model

import (
	"time"

	"github.com/google/uuid"
)

type Circle struct {
	ID          uuid.UUID
	Name        string
	Description string
	CreatorID   uuid.UUID
	MemberCount int
	Tags        []string
	IsPublic    bool
	IsJoined    bool
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CircleMember struct {
	CircleID uuid.UUID
	UserID   uuid.UUID
	Role     string
	JoinedAt time.Time
}

type CircleMemberProfile struct {
	UserID    uuid.UUID
	FirstName string
	LastName  string
	AvatarURL string
	Role      string
	JoinedAt  time.Time
}

type ListCirclesOptions struct {
	Limit  int32
	Offset int32
}

const (
	DefaultCirclesLimit = 20
	MaxCirclesLimit     = 100
)

type ListCirclesResponse struct {
	Circles    []*Circle
	TotalCount int32
}
