package circle

import (
	"context"

	"api/internal/model"

	"github.com/google/uuid"
)

//go:generate mockery --case underscore --name Service --with-expecter --output mocks
type Service interface {
	ListCircles(context.Context, uuid.UUID, model.ListCirclesOptions) (*model.ListCirclesResponse, error)
	CreateCircle(context.Context, uuid.UUID, string, string, []string) (*model.Circle, error)
	JoinCircle(context.Context, uuid.UUID, uuid.UUID) error
	LeaveCircle(context.Context, uuid.UUID, uuid.UUID) error
}
