package profile

import (
	"context"
	"time"

	"github.com/google/uuid"

	"api/internal/model"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	CreateTelegramAuthChallenge(ctx context.Context) (*model.TelegramAuthChallenge, error)
	TelegramAuth(ctx context.Context, botToken, authData string) (*model.ProfileResponse, string, time.Time, int64, error)
	StartYandexAuth(ctx context.Context) (*model.YandexAuthStart, error)
	YandexAuth(ctx context.Context, code, state string) (*model.ProfileResponse, string, time.Time, error)
	BindTelegram(ctx context.Context, userID uuid.UUID, botToken, username string) (*model.ProfileResponse, int64, error)
	CompleteRegistration(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.ProfileResponse, string, time.Time, error)
	GetProfileByID(ctx context.Context, userID uuid.UUID) (*model.ProfileResponse, error)
	UpdateLocation(ctx context.Context, userID uuid.UUID, req model.CompleteRegistrationRequest) (*model.ProfileResponse, error)
	UpdateProfile(ctx context.Context, userID uuid.UUID, username string) (*model.ProfileResponse, error)
	Logout(ctx context.Context, sessionToken string) error
	DevBypass() bool
	DevUserID() string
}

//go:generate mockery --case underscore --name SessionCookieManager --with-expecter --output mocks
type SessionCookieManager interface {
	SetSessionCookie(ctx context.Context, token string, expiry time.Time)
	ClearSessionCookie(ctx context.Context)
}

// ProgressRepository retrieves profile progress data.
type ProgressRepository interface {
	GetProfileProgress(ctx context.Context, userID uuid.UUID) (*model.ProfileProgress, error)
	SaveUserGoal(ctx context.Context, userID uuid.UUID, goal *model.UserGoal) error
	GetProfileFeed(ctx context.Context, userID uuid.UUID, limit int) ([]*model.FeedItem, error)
}

// WalletRepository returns the current balance for a user, auto-creating
// a zero-balance row on first access.
type WalletRepository interface {
	GetOrCreate(ctx context.Context, userID uuid.UUID) (*model.WalletBalance, error)
}

// PreferencesRepository — ADR-005. Reads/writes user_preferences.
type PreferencesRepository interface {
	GetOrInitPreferences(ctx context.Context, userID uuid.UUID) (*PreferencesRow, error)
	UpsertPreferences(ctx context.Context, userID uuid.UUID, density, locale string) (*PreferencesRow, error)
}

type PreferencesRow struct {
	UserID        uuid.UUID
	LayoutDensity string
	Locale        string
}
