package profile

import (
	"context"
	"time"

	"github.com/google/uuid"

	"api/internal/model"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	CreateTelegramAuthChallenge(context.Context) (*model.TelegramAuthChallenge, error)
	TelegramAuth(context.Context, string, string) (*model.ProfileResponse, string, time.Time, int64, error)
	StartYandexAuth(context.Context) (*model.YandexAuthStart, error)
	YandexAuth(context.Context, string, string) (*model.ProfileResponse, string, time.Time, error)
	BindTelegram(context.Context, uuid.UUID, string, string) (*model.ProfileResponse, int64, error)
	CompleteRegistration(context.Context, uuid.UUID, model.CompleteRegistrationRequest) (*model.ProfileResponse, string, time.Time, error)
	GetProfileByID(context.Context, uuid.UUID) (*model.ProfileResponse, error)
	UpdateLocation(context.Context, uuid.UUID, model.CompleteRegistrationRequest) (*model.ProfileResponse, error)
	UpdateProfile(context.Context, uuid.UUID, string) (*model.ProfileResponse, error)
	Logout(context.Context, string) error
	DevBypass() bool
	DevUserID() string
}

//go:generate mockery --case underscore --name SessionCookieManager --with-expecter --output mocks
type SessionCookieManager interface {
	SetSessionCookie(context.Context, string, time.Time)
	ClearSessionCookie(context.Context)
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
