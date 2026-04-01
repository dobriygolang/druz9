package referral

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	ListReferrals(context.Context, *model.User, model.ListReferralsOptions) (*model.ListReferralsResponse, error)
	CreateReferral(context.Context, *model.User, model.CreateReferralRequest) (*model.Referral, error)
	UpdateReferral(context.Context, uuid.UUID, *model.User, model.UpdateReferralRequest) (*model.Referral, error)
	DeleteReferral(context.Context, uuid.UUID, *model.User) error
}
