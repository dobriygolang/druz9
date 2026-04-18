package model

import (
	"time"

	"github.com/google/uuid"
)

// SlotType mirrors the proto enum. Keep in sync with
// api/learning/peer_mock/v1/peer_mock.proto.
type SlotType int16

const (
	SlotTypeUnspecified  SlotType = 0
	SlotTypeAlgo         SlotType = 1
	SlotTypeSystemDesign SlotType = 2
	SlotTypeBehavioral   SlotType = 3
	SlotTypeFull         SlotType = 4
)

type SlotLevel int16

const (
	SlotLevelUnspecified SlotLevel = 0
	SlotLevelJunior      SlotLevel = 1
	SlotLevelMid         SlotLevel = 2
	SlotLevelSenior      SlotLevel = 3
)

type SlotStatus int16

const (
	SlotStatusUnspecified SlotStatus = 0
	SlotStatusOpen        SlotStatus = 1
	SlotStatusBooked      SlotStatus = 2
	SlotStatusCompleted   SlotStatus = 3
	SlotStatusCancelled   SlotStatus = 4
)

type BookingStatus int16

const (
	BookingStatusUnspecified        BookingStatus = 0
	BookingStatusScheduled          BookingStatus = 1
	BookingStatusInProgress         BookingStatus = 2
	BookingStatusCompleted          BookingStatus = 3
	BookingStatusCancelledByBooker  BookingStatus = 4
	BookingStatusCancelledByOfferer BookingStatus = 5
	BookingStatusNoShowBooker       BookingStatus = 6
	BookingStatusNoShowOfferer      BookingStatus = 7
)

type MockSlot struct {
	ID                     uuid.UUID
	InterviewerID          uuid.UUID
	InterviewerName        string
	InterviewerReliability int32
	StartsAt               time.Time
	EndsAt                 time.Time
	Type                   SlotType
	Level                  SlotLevel
	PriceGold              int32
	Status                 SlotStatus
	Note                   string
	CreatedAt              time.Time
}

type MockBooking struct {
	ID              uuid.UUID
	SlotID          uuid.UUID
	InterviewerID   uuid.UUID
	InterviewerName string
	IntervieweeID   uuid.UUID
	IntervieweeName string
	StartsAt        time.Time
	EndsAt          time.Time
	Status          BookingStatus
	RoomID          uuid.UUID // zero means not started yet
	PriceGold       int32
	ReviewedByMe    bool
}

type UserReliability struct {
	UserID        uuid.UUID
	Score         int32
	PenaltyCount  int32
	LastPenaltyAt *time.Time
	BanUntil      *time.Time
}

// ReliabilityTier labels the score in a way the UI can read directly.
// Thresholds match the plan (0..49 = unranked, 50..79 = reliable, 80..89
// = featured, 90..100 = verified).
func ReliabilityTier(score int32) string {
	switch {
	case score >= 90:
		return "verified"
	case score >= 80:
		return "featured"
	case score >= 50:
		return "reliable"
	default:
		return "unranked"
	}
}
