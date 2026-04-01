package referral

import (
	v1 "api/pkg/api/referral/v1"

	"google.golang.org/grpc"
)

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
