package profile

import (
	"context"
	"time"

	profiledomain "api/internal/domain/profile"
	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	CreateTelegramAuthChallenge(context.Context) (*model.TelegramAuthChallenge, error)
	ConfirmTelegramAuth(context.Context, string, string, model.TelegramAuthPayload) (string, error)
	TelegramAuth(context.Context, string, string) (*model.ProfileResponse, string, time.Time, error)
	BindTelegram(context.Context, uuid.UUID, string, string) (*model.ProfileResponse, error)
	RegisterWithPassword(context.Context, model.PasswordRegistrationRequest) (*model.ProfileResponse, string, time.Time, error)
	LoginWithPassword(context.Context, model.PasswordLoginRequest) (*model.ProfileResponse, string, time.Time, error)
	CompleteRegistration(context.Context, uuid.UUID, model.CompleteRegistrationRequest) (*model.ProfileResponse, string, time.Time, error)
	GetProfileByID(context.Context, uuid.UUID) (*model.ProfileResponse, error)
	UpdateLocation(context.Context, uuid.UUID, model.CompleteRegistrationRequest) (*model.ProfileResponse, error)
	UpdateProfile(context.Context, uuid.UUID, string) (*model.ProfileResponse, error)
	PreparePhotoUpload(context.Context, string, string, string) (*profiledomain.PhotoUploadTarget, error)
	CompletePhotoUpload(context.Context, uuid.UUID, string) (*model.ProfileResponse, error)
	Logout(context.Context, string) error
	GetAvatarURL(context.Context, string) (string, error)
	DevBypass() bool
	DevUserID() string
}

//go:generate mockery --case underscore --name SessionCookieManager --with-expecter --output mocks
type SessionCookieManager interface {
	SetSessionCookie(context.Context, string, time.Time)
	ClearSessionCookie(context.Context)
}

// Implementation of profile service.
type Implementation struct {
	v1.UnimplementedProfileServiceServer
	service Service
	cookie  SessionCookieManager
}

// New returns new instance of Implementation.
func New(service Service, cookie SessionCookieManager) *Implementation {
	return &Implementation{service: service, cookie: cookie}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.ProfileService_ServiceDesc
}

// DevBypass returns whether dev bypass is enabled.
func (i *Implementation) DevBypass() bool {
	if s, ok := i.service.(interface{ DevBypass() bool }); ok {
		return s.DevBypass()
	}
	return false
}

// DevUserID returns the dev user ID for bypass mode.
func (i *Implementation) DevUserID() string {
	if s, ok := i.service.(interface{ DevUserID() string }); ok {
		return s.DevUserID()
	}
	return ""
}
