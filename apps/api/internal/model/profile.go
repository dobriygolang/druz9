package model

import (
	"time"

	"github.com/google/uuid"
)

type UserActivityStatus int

const (
	UserActivityStatusUnknown UserActivityStatus = iota
	UserActivityStatusOnline
	UserActivityStatusRecentlyActive
	UserActivityStatusOffline
)

func (s UserActivityStatus) String() string {
	switch s {
	case UserActivityStatusOnline:
		return "online"
	case UserActivityStatusRecentlyActive:
		return "recently_active"
	case UserActivityStatusOffline:
		return "offline"
	default:
		return ""
	}
}

func UserActivityStatusFromString(s string) UserActivityStatus {
	switch s {
	case "online":
		return UserActivityStatusOnline
	case "recently_active":
		return UserActivityStatusRecentlyActive
	case "offline":
		return UserActivityStatusOffline
	default:
		return UserActivityStatusUnknown
	}
}

type UserStatus int

const (
	UserStatusUnknown UserStatus = iota
	UserStatusPendingProfile
	UserStatusActive
	UserStatusGuest
)

func (s UserStatus) String() string {
	switch s {
	case UserStatusPendingProfile:
		return "pending_profile"
	case UserStatusActive:
		return "active"
	case UserStatusGuest:
		return "guest"
	default:
		return ""
	}
}

func UserStatusFromString(str string) UserStatus {
	switch str {
	case "pending_profile":
		return UserStatusPendingProfile
	case "active":
		return UserStatusActive
	case "guest":
		return UserStatusGuest
	default:
		return UserStatusUnknown
	}
}

type User struct {
	ID                 uuid.UUID
	Username           string
	TelegramUsername   string
	FirstName          string
	LastName           string
	AvatarURL          string
	CurrentWorkplace   string
	Region             string
	Geo                UserGeo
	Status             UserStatus
	ActivityStatus     UserActivityStatus
	IsAdmin            bool
	IsTrusted          bool
	ConnectedProviders []string
	PrimaryProvider    string
	LastActiveAt       time.Time
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

type UserGeo struct {
	Region    string
	Country   string
	City      string
	Latitude  float64
	Longitude float64
}

type TelegramAuthPayload struct {
	ID        int64
	FirstName string
	LastName  string
	Username  string
	PhotoURL  string
}

type AuthProvider string

const (
	AuthProviderTelegram AuthProvider = "telegram"
	AuthProviderYandex   AuthProvider = "yandex"
)

type UserIdentity struct {
	UserID         uuid.UUID
	Provider       AuthProvider
	ProviderUserID string
	Username       string
	Email          string
	AvatarURL      string
	IsPrimary      bool
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type IdentityAuthPayload struct {
	Provider       AuthProvider
	ProviderUserID string
	Username       string
	Email          string
	FirstName      string
	LastName       string
	AvatarURL      string
}

type TelegramAuthChallenge struct {
	Token       string
	BotStartURL string
	ExpiresAt   time.Time
}

type YandexAuthStart struct {
	State     string
	AuthURL   string
	ExpiresAt time.Time
}

type CompleteRegistrationRequest struct {
	Name      string
	Region    string
	Country   string
	City      string
	Latitude  float64
	Longitude float64
}

type ProfileResponse struct {
	User                 *User
	NeedsProfileComplete bool
}

type YandexAuthUser struct {
	ID        string
	Login     string
	Email     string
	FirstName string
	LastName  string
	AvatarURL string
}

func ResolveActivityStatus(lastActiveAt, now time.Time) UserActivityStatus {
	if lastActiveAt.IsZero() {
		return UserActivityStatusOffline
	}

	diff := now.Sub(lastActiveAt)
	switch {
	case diff <= 2*time.Minute:
		return UserActivityStatusOnline
	case diff <= 15*time.Minute:
		return UserActivityStatusRecentlyActive
	default:
		return UserActivityStatusOffline
	}
}
