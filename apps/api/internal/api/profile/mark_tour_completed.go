package profile

import (
	"context"
	"fmt"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) MarkTourCompleted(ctx context.Context, req *v1.MarkTourCompletedRequest) (*v1.ListCompletedToursResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	tourID := req.GetTourId()
	if tourID == "" {
		return nil, kratoserrors.BadRequest("INVALID_TOUR_ID", "tour_id is required")
	}
	if i.tours == nil {
		return &v1.ListCompletedToursResponse{}, nil
	}
	if err := i.tours.MarkTourCompleted(ctx, user.ID, tourID); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to mark tour")
	}
	ids, err := i.tours.ListCompletedTours(ctx, user.ID)
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to reload tours")
	}
	return &v1.ListCompletedToursResponse{TourIds: ids}, nil
}
