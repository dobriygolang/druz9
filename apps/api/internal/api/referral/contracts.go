package referral

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	ListReferrals(ctx context.Context, user *model.User, opts model.ListReferralsOptions) (*model.ListReferralsResponse, error)
	CreateReferral(ctx context.Context, user *model.User, req model.CreateReferralRequest) (*model.Referral, error)
	UpdateReferral(ctx context.Context, id uuid.UUID, user *model.User, req model.UpdateReferralRequest) (*model.Referral, error)
	DeleteReferral(ctx context.Context, id uuid.UUID, user *model.User) error
}
