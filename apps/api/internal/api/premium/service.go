package premium

import (
	"api/internal/boosty"
	premiumdata "api/internal/data/premium"
	v1 "api/pkg/api/premium/v1"
	"google.golang.org/grpc"
)

// Implementation of premium service.
type Implementation struct {
	v1.UnimplementedPremiumServiceServer
	repo   *premiumdata.Repo
	client *boosty.Client
}

// New returns new instance of Implementation.
func New(repo *premiumdata.Repo, client *boosty.Client) *Implementation {
	return &Implementation{repo: repo, client: client}
}

// BoostyClient exposes the underlying Boosty client for background workers.
func (i *Implementation) BoostyClient() *boosty.Client {
	return i.client
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.PremiumService_ServiceDesc
}
