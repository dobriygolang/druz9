package model

import (
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
	ScheduledAt      time.Time
	CreatedAt        time.Time
	CreatorID        string
	CreatorName      string
	IsCreator        bool
	IsJoined         bool
	ParticipantCount int
	Participants     []*EventParticipant
}

// ListEventsOptions defines filters and pagination for event listing.
type ListEventsOptions struct {
	Limit     int32
	Offset    int32
	From      *time.Time
	To        *time.Time
	CreatorID *uuid.UUID
	Status    string
}

const (
	DefaultEventsLimit = 20
	MaxEventsLimit     = 100
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
	MeetingLink    string
	Region         string
	Country        string
	City           string
	Latitude       float64
	Longitude      float64
	ScheduledAt    time.Time
	InvitedUserIDs []string
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
	ScheduledAt    time.Time
	InvitedUserIDs []string
}
