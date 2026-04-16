package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type EventParticipantStatus int

const (
	EventParticipantStatusUnknown EventParticipantStatus = iota
	EventParticipantStatusPending
	EventParticipantStatusConfirmed
	EventParticipantStatusDeclined
)

func (s EventParticipantStatus) String() string {
	switch s {
	case EventParticipantStatusPending:
		return "pending"
	case EventParticipantStatusConfirmed:
		return "confirmed"
	case EventParticipantStatusDeclined:
		return "declined"
	default:
		return ""
	}
}

func EventParticipantStatusFromString(s string) EventParticipantStatus {
	switch s {
	case "pending":
		return EventParticipantStatusPending
	case "confirmed":
		return EventParticipantStatusConfirmed
	case "declined":
		return EventParticipantStatusDeclined
	default:
		return EventParticipantStatusUnknown
	}
}

type EventParticipant struct {
	UserID           string
	Title            string
	AvatarURL        string
	TelegramUsername string
	FirstName        string
	LastName         string
	Status           EventParticipantStatus
}

type Event struct {
	ID               uuid.UUID
	Title            string
	PlaceLabel       string
	Description      string
	MeetingLink      string
	Region           string
	Country          string
	City             string
	Latitude         float64
	Longitude        float64
	ScheduledAt      *time.Time
	CreatedAt        time.Time
	CreatorID        string
	CreatorName      string
	IsCreator        bool
	IsJoined         bool
	IsPublic         bool
	ParticipantCount int
	Participants     []*EventParticipant
	CircleID         *uuid.UUID
	Repeat           string
	Status           string
}

type eventDeleteScopeContextKey struct{}

func ContextWithEventDeleteScope(ctx context.Context, scope string) context.Context {
	return context.WithValue(ctx, eventDeleteScopeContextKey{}, scope)
}

func EventDeleteScopeFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	scope, _ := ctx.Value(eventDeleteScopeContextKey{}).(string)
	return scope
}

// ListEventsOptions defines filters and pagination for event listing.
type ListEventsOptions struct {
	Limit     int32
	Offset    int32
	From      *time.Time
	To        *time.Time
	CreatorID *uuid.UUID
	CircleID  *uuid.UUID
	Status    string
	// IncludeAllStatuses bypasses approval filtering (for admins).
	IncludeAllStatuses bool
	// ViewerID is the current user — they can see their own pending events.
	ViewerID *uuid.UUID
}

const (
	DefaultEventsLimit = 20
	MaxEventsLimit     = 100
)

const (
	EventRepeatNone    = "none"
	EventRepeatDaily   = "daily"
	EventRepeatWeekly  = "weekly"
	EventRepeatMonthly = "monthly"
	EventRepeatYearly  = "yearly"
)

const (
	EventStatusPending  = "pending"
	EventStatusApproved = "approved"
	EventStatusRejected = "rejected"
)

type ListEventsResponse struct {
	Events      []*Event
	Limit       int32
	Offset      int32
	TotalCount  int32
	HasNextPage bool
}

type CreateEventRequest struct {
	Title          string
	PlaceLabel     string
	Description    string
	Repeat         string
	MeetingLink    string
	Region         string
	Country        string
	City           string
	Latitude       float64
	Longitude      float64
	ScheduledAt    *time.Time
	InvitedUserIDs []string
	CircleID       *uuid.UUID
	IsPublic       bool
	Status         string
}

type UpdateEventRequest struct {
	Title          string
	PlaceLabel     string
	Description    string
	MeetingLink    string
	Region         string
	Country        string
	City           string
	Latitude       float64
	Longitude      float64
	ScheduledAt    *time.Time
	InvitedUserIDs []string
}
