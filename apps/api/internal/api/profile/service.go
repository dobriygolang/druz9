package profile

import (
	"context"
	"time"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

type Service interface {
	TelegramAuth(context.Context, model.TelegramAuthPayload) (*model.ProfileResponse, string, time.Time, error)
	CompleteRegistration(context.Context, uuid.UUID, model.CompleteRegistrationRequest) (*model.ProfileResponse, string, time.Time, error)
	GetProfileByID(context.Context, uuid.UUID) (*model.ProfileResponse, error)
	UpdateLocation(context.Context, uuid.UUID, model.CompleteRegistrationRequest) (*model.ProfileResponse, error)
	UpdateProfile(context.Context, uuid.UUID, string) (*model.ProfileResponse, error)
	Logout(context.Context, string) error
}

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
