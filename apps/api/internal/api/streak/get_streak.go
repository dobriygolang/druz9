package streak

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	v1 "api/pkg/api/streak/v1"
)

func (i *Implementation) GetStreak(ctx context.Context, _ *v1.GetStreakRequest) (*v1.GetStreakResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	state, err := i.service.GetStreak(ctx, user.ID)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to load streak state")
	}
	return &v1.GetStreakResponse{State: mapState(state)}, nil
}
