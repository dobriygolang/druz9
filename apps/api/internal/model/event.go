package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	EventParticipantStatusInvited = "invited"
	EventParticipantStatusJoined  = "joined"
)

type EventParticipant struct {
	UserID           string `json:"user_id"`
	Title            string `json:"title"`
	AvatarURL        string `json:"avatar_url"`
	TelegramUsername string `json:"telegram_username"`
	FirstName        string `json:"first_name"`
	LastName         string `json:"last_name"`
	Status           string `json:"status"`
}

type Event struct {
	ID               uuid.UUID           `json:"id"`
	Title            string              `json:"title"`
	PlaceLabel       string              `json:"place_label"`
	Description      string              `json:"description"`
	MeetingLink      string              `json:"meeting_link"`
	Region           string              `json:"region"`
	Country          string              `json:"country"`
	City             string              `json:"city"`
	Latitude         float64             `json:"latitude"`
	Longitude        float64             `json:"longitude"`
	ScheduledAt      time.Time           `json:"scheduled_at"`
	CreatedAt        time.Time           `json:"created_at"`
	CreatorID        string              `json:"creator_id"`
	CreatorName      string              `json:"creator_name"`
	IsCreator        bool                `json:"is_creator"`
	IsJoined         bool                `json:"is_joined"`
	ParticipantCount int                 `json:"participant_count"`
	Participants     []*EventParticipant `json:"participants"`
}

// ListEventsOptions defines filters and pagination for event listing.
type ListEventsOptions struct {
	Limit     int32      // Number of events to return (default 20, max 100)
	Offset    int32      // Number of events to skip
	From      *time.Time // Filter events scheduled from this time
	To        *time.Time // Filter events scheduled to this time
	CreatorID *uuid.UUID // Filter by creator
	Status    string     // "upcoming" or "past"
}

const (
	DefaultEventsLimit = 20
	MaxEventsLimit     = 100
)

type ListEventsResponse struct {
	Events      []*Event `json:"events"`
	Limit       int32    `json:"limit"`
	Offset      int32    `json:"offset"`
	TotalCount  int32    `json:"total_count"`
	HasNextPage bool     `json:"has_next_page"`
}

type CreateEventRequest struct {
	Title          string    `json:"title"`
	PlaceLabel     string    `json:"place_label"`
	Description    string    `json:"description"`
	MeetingLink    string    `json:"meeting_link"`
	Region         string    `json:"region"`
	Country        string    `json:"country"`
	City           string    `json:"city"`
	Latitude       float64   `json:"latitude"`
	Longitude      float64   `json:"longitude"`
	ScheduledAt    time.Time `json:"scheduled_at"`
	InvitedUserIDs []string  `json:"invited_user_ids"`
}

type UpdateEventRequest struct {
	Title          string    `json:"title"`
	PlaceLabel     string    `json:"place_label"`
	Description    string    `json:"description"`
	MeetingLink    string    `json:"meeting_link"`
	Region         string    `json:"region"`
	Country        string    `json:"country"`
	City           string    `json:"city"`
	Latitude       float64   `json:"latitude"`
	Longitude      float64   `json:"longitude"`
	ScheduledAt    time.Time `json:"scheduled_at"`
	InvitedUserIDs []string  `json:"invited_user_ids"`
}
