// Package shop implements the gRPC/HTTP transport for the Shop service.
package shop

import (
	"google.golang.org/grpc"

	v1 "api/pkg/api/shop/v1"
)

// Implementation is the gRPC/HTTP handler for the Shop service.
type Implementation struct {
	v1.UnimplementedShopServiceServer
	service Service
}

func New(s Service) *Implementation { return &Implementation{service: s} }

func (i *Implementation) GetDescription() grpc.ServiceDesc { return v1.ShopService_ServiceDesc }
