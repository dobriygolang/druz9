package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	UserStatusPendingProfile = "pending_profile"
	UserStatusActive         = "active"

	UserActivityOnline         = "online"
	UserActivityRecentlyActive = "recently_active"
	UserActivityOffline        = "offline"
)

type User struct {
	ID               uuid.UUID `json:"id"`
	TelegramID       int64     `json:"telegram_id"`
	TelegramUsername string    `json:"telegram_username,omitempty"`
	FirstName        string    `json:"first_name,omitempty"`
	LastName         string    `json:"last_name,omitempty"`
	AvatarURL        string    `json:"avatar_url,omitempty"`
	CurrentWorkplace string    `json:"current_workplace,omitempty"`
	Region           string    `json:"region,omitempty"`
	Geo              UserGeo   `json:"geo"`
	Status           string    `json:"status"`
	ActivityStatus   string    `json:"activity_status"`
	IsAdmin          bool      `json:"is_admin"`
	LastActiveAt     time.Time `json:"last_active_at"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type UserGeo struct {
	Region    string  `json:"region,omitempty"`
	Country   string  `json:"country,omitempty"`
	City      string  `json:"city,omitempty"`
	Latitude  float64 `json:"latitude,omitempty"`
	Longitude float64 `json:"longitude,omitempty"`
}

type TelegramAuthPayload struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Username  string `json:"username"`
	PhotoURL  string `json:"photo_url"`
	AuthDate  int64  `json:"auth_date"`
	Hash      string `json:"hash"`
}

type CompleteRegistrationRequest struct {
	Name      string  `json:"name"`
	Region    string  `json:"region"`
	Country   string  `json:"country"`
	City      string  `json:"city"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type ProfileResponse struct {
	User                 *User `json:"user"`
	NeedsProfileComplete bool  `json:"needs_profile_complete"`
}

func ResolveActivityStatus(lastActiveAt, now time.Time) string {
	if lastActiveAt.IsZero() {
		return UserActivityOffline
	}

	diff := now.Sub(lastActiveAt)
	switch {
	case diff <= 2*time.Minute:
		return UserActivityOnline
	case diff <= 15*time.Minute:
		return UserActivityRecentlyActive
	default:
		return UserActivityOffline
	}
}
