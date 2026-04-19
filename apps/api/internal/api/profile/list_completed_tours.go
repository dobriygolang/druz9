package profile

import (
	"context"
	"fmt"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/apihelpers"
	v1 "api/pkg/api/profile/v1"
)

// ToursRepo backs the onboarding tour set (ADR-004). Defined here so the
// API package doesn't import data/.
type ToursRepo interface {
	ListCompletedTours(ctx context.Context, userID uuid.UUID) ([]string, error)
	MarkTourCompleted(ctx context.Context, userID uuid.UUID, tourID string) error
}

// WithToursRepo wires onboarding tour persistence (ADR-004). Optional.
func (i *Implementation) WithToursRepo(r ToursRepo) *Implementation {
	i.tours = r
	return i
}

func (i *Implementation) ListCompletedTours(ctx context.Context, _ *v1.ListCompletedToursRequest) (*v1.ListCompletedToursResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.tours == nil {
		return &v1.ListCompletedToursResponse{}, nil
	}
	ids, err := i.tours.ListCompletedTours(ctx, user.ID)
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to list tours")
	}
	return &v1.ListCompletedToursResponse{TourIds: ids}, nil
}
