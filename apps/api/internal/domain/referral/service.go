package referral

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

// Config represents referral domain service configuration.
type Config struct {
	Repository Repository
}

// Service implements referral domain logic.
type Service struct {
	repo Repository
}

// Repository is a data-layer interface for referral queries.
//
//go:generate mockery --case underscore --name Repository --with-expecter --output mocks
type Repository interface {
	ListReferrals(ctx context.Context, user *model.User, opts model.ListReferralsOptions) (*model.ListReferralsResponse, error)
	CreateReferral(ctx context.Context, user *model.User, req model.CreateReferralRequest) (*model.Referral, error)
	UpdateReferral(ctx context.Context, referralID uuid.UUID, user *model.User, req model.UpdateReferralRequest) (*model.Referral, error)
	DeleteReferral(ctx context.Context, referralID uuid.UUID, user *model.User) error
}

// NewReferralService creates new referral domain service.
func NewReferralService(c Config) *Service {
	return &Service{
		repo: c.Repository,
	}
}
