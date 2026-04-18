package season_pass

import (
	"context"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	seasonpassdomain "api/internal/domain/season_pass"
	v1 "api/pkg/api/season_pass/v1"
)

func (i *Implementation) PurchasePremium(ctx context.Context, _ *v1.PurchasePremiumRequest) (*v1.PurchasePremiumResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	progress, err := i.service.PurchasePremium(ctx, user.ID)
	if err != nil {
		switch {
		case goerr.Is(err, seasonpassdomain.ErrNoActivePass):
			return nil, errors.NotFound("NO_ACTIVE_PASS", "no active season pass")
		case goerr.Is(err, seasonpassdomain.ErrAlreadyPurchased):
			return nil, errors.Conflict("ALREADY_PURCHASED", "premium already active")
		case goerr.Is(err, seasonpassdomain.ErrInsufficientGems):
			return nil, errors.BadRequest("INSUFFICIENT_GEMS", "not enough gems")
		default:
			return nil, errors.InternalServer("INTERNAL", "failed to purchase premium")
		}
	}
	return &v1.PurchasePremiumResponse{Progress: mapProgress(progress)}, nil
}
