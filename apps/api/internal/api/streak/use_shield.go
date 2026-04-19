package streak

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	v1 "api/pkg/api/streak/v1"
)

func (i *Implementation) UseShield(ctx context.Context, _ *v1.UseShieldRequest) (*v1.UseShieldResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	state, restoredTo, err := i.service.UseShield(ctx, user.ID)
	if err != nil {
		return nil, mapStreakErr(err)
	}
	return &v1.UseShieldResponse{State: mapState(state), RestoredToDays: restoredTo}, nil
}
