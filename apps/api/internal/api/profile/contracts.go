package profile

import (
	"context"
	"time"

	"api/internal/model"

	"github.com/google/uuid"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	CreateTelegramAuthChallenge(context.Context) (*model.TelegramAuthChallenge, error)
	ConfirmTelegramAuth(context.Context, string, string, model.TelegramAuthPayload) (string, error)
	TelegramAuth(context.Context, string, string) (*model.ProfileResponse, string, time.Time, error)
	StartYandexAuth(context.Context) (*model.YandexAuthStart, error)
	YandexAuth(context.Context, string, string) (*model.ProfileResponse, string, time.Time, error)
	BindTelegram(context.Context, uuid.UUID, string, string) (*model.ProfileResponse, error)
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
	GetDailyActivity(ctx context.Context, userID uuid.UUID, days int) (map[string]int, error)
	SaveUserGoal(ctx context.Context, userID uuid.UUID, goal *model.UserGoal) error
}
