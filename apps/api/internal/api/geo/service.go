package geo

import (
	"context"

	"google.golang.org/grpc"

	"api/internal/model"
	v1 "api/pkg/api/geo/v1"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	Resolve(context.Context, string) (*model.GeoResolveResponse, error)
	CommunityMap(context.Context, string) (*model.CommunityMapResponse, error)
	WorldPins(ctx context.Context) ([]*model.WorldPin, error)
}

// Implementation of geo service.
type Implementation struct {
	v1.UnimplementedGeoServiceServer
	service Service
}

// New returns new instance of Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.GeoService_ServiceDesc
}
