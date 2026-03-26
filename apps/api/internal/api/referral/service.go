package referral

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/referral/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

type Service interface {
	ListReferrals(context.Context, *model.User, model.ListReferralsOptions) (*model.ListReferralsResponse, error)
	CreateReferral(context.Context, *model.User, model.CreateReferralRequest) (*model.Referral, error)
	UpdateReferral(context.Context, uuid.UUID, *model.User, model.UpdateReferralRequest) (*model.Referral, error)
	DeleteReferral(context.Context, uuid.UUID, *model.User) error
}

// Implementation of referral service.
type Implementation struct {
	v1.UnimplementedReferralServiceServer
	service Service
}

// New returns new instance of Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.ReferralService_ServiceDesc
}
