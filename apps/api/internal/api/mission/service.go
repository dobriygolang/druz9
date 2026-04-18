package mission

import (
	"context"

	"github.com/google/uuid"
	"google.golang.org/grpc"

	"api/internal/model"
	v1 "api/pkg/api/mission/v1"
)

// Service is a thin interface over mission domain service used by the transport layer.
type Service interface {
	GetDailyMissions(ctx context.Context, userID uuid.UUID) (*model.DailyMissionsResponse, error)
	CompleteMission(ctx context.Context, userID uuid.UUID, missionKey string) error
}

// Implementation is the gRPC/HTTP handler for MissionService.
type Implementation struct {
	v1.UnimplementedMissionServiceServer
	service Service
}

// New constructs mission service Implementation.
func New(service Service) *Implementation {
	return &Implementation{service: service}
}

// GetDescription returns grpc service description.
func (i *Implementation) GetDescription() grpc.ServiceDesc {
	return v1.MissionService_ServiceDesc
}
