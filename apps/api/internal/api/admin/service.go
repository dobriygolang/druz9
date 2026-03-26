package admin

import (
	"context"

	v1 "api/pkg/api/admin/v1"

	"github.com/google/uuid"
	"google.golang.org/grpc"
)

type Service interface {
	DeleteUser(context.Context, uuid.UUID) error
}

// Implementation of admin service.
type Implementation struct {
	v1.UnimplementedAdminServiceServer
	service Service
}

// New returns new instance of Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.AdminService_ServiceDesc
}
