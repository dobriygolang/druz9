package admin

import (
	"context"

	"github.com/google/uuid"
	"google.golang.org/grpc"

	"api/internal/rtc"
	v1 "api/pkg/api/admin/v1"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	DeleteUser(ctx context.Context, userID uuid.UUID) error
}

type ConfigService interface {
	GetValue(ctx context.Context, key rtc.Key) rtc.Value
	SetValue(ctx context.Context, key rtc.Key, value string) error
	ListVariables(ctx context.Context) map[rtc.Key]rtc.Variable
}

// UserManager handles trusted/admin flag mutations on users.
type UserManager interface {
	UpdateUserTrusted(ctx context.Context, userID uuid.UUID, isTrusted bool) error
	UpdateUserAdmin(ctx context.Context, userID uuid.UUID, isAdmin bool) error
}

// CacheInvalidator invalidates cached profile data.
type CacheInvalidator interface {
	InvalidateProfileCache(userID uuid.UUID)
}

// WalletGranter mints currency for a user. The full wallet domain has
// dozens of methods; we expose only the slice the admin handler needs so
// tests can satisfy it with a tiny fake.
type WalletGranter interface {
	Grant(ctx context.Context, userID uuid.UUID, currency string, amount int64, reason string) error
}

// Implementation of admin service.
type Implementation struct {
	v1.UnimplementedAdminServiceServer
	service          Service
	configService    ConfigService
	userManager      UserManager
	cacheInval       CacheInvalidator
	dockerLogsRunner dockerLogsRunner
	wallet           WalletGranter
}

// New returns new instance of Implementation.
func New(service Service, configService ConfigService, userManager UserManager, cacheInval CacheInvalidator) *Implementation {
	return &Implementation{
		service:       service,
		configService: configService,
		userManager:   userManager,
		cacheInval:    cacheInval,
	}
}

// WithWalletGranter wires the wallet credit path used by GrantCurrency.
func (i *Implementation) WithWalletGranter(g WalletGranter) *Implementation {
	i.wallet = g
	return i
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.AdminService_ServiceDesc
}
