package premium

import (
	"context"
	"errors"
	"time"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	premiumdata "api/internal/data/premium"
	v1 "api/pkg/api/premium/v1"
)

func (i *Implementation) GetStatus(ctx context.Context, req *v1.GetStatusRequest) (*v1.PremiumStatus, error) {
	_ = req
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	row, err := i.repo.Get(ctx, user.ID)
	if errors.Is(err, premiumdata.ErrNotFound) {
		return &v1.PremiumStatus{Active: false}, nil
	}
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to load status")
	}

	return &v1.PremiumStatus{
		Active:      row.Active && row.ExpiresAt.After(time.Now()),
		Source:      row.Source,
		BoostyEmail: row.BoostyEmail,
		ExpiresAt:   row.ExpiresAt.UTC().Format(time.RFC3339),
	}, nil
}
