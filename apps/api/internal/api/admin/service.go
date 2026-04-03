package admin

import (
	"context"

	"api/internal/rtc"
	v1 "api/pkg/api/admin/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	DeleteUser(context.Context, uuid.UUID) error
}

type ConfigService interface {
	GetValue(context.Context, rtc.Key) rtc.Value
	SetValue(context.Context, rtc.Key, string) error
	ListVariables(context.Context) map[rtc.Key]rtc.Variable
}

// Implementation of admin service.
type Implementation struct {
	v1.UnimplementedAdminServiceServer
	service       Service
	configService ConfigService
}

// New returns new instance of Implementation.
func New(service Service, configService ConfigService) *Implementation {
	return &Implementation{
		service:       service,
		configService: configService,
	}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.AdminService_ServiceDesc
}
