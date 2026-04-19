package profile

import (
	"google.golang.org/grpc"

	notif "api/internal/clients/notification"
	v1 "api/pkg/api/profile/v1"
)

// Implementation of profile service.
type Implementation struct {
	v1.UnimplementedProfileServiceServer
	service      Service
	cookie       SessionCookieManager
	progressRepo ProgressRepository
	walletRepo   WalletRepository
	notif        notif.Sender
	prefsRepo    PreferencesRepository
}

// New returns new instance of Implementation.
func New(service Service, cookie SessionCookieManager, progressRepo ProgressRepository, walletRepo WalletRepository, notificationSender notif.Sender) *Implementation {
	return &Implementation{service: service, cookie: cookie, progressRepo: progressRepo, walletRepo: walletRepo, notif: notificationSender}
}

// WithPreferencesRepo wires user_preferences storage (ADR-005).
func (i *Implementation) WithPreferencesRepo(r PreferencesRepository) *Implementation {
	i.prefsRepo = r
	return i
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.ProfileService_ServiceDesc
}
