package season_pass

import (
	"context"
	"fmt"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/apihelpers"
	seasonpassdomain "api/internal/domain/season_pass"
	walletdomain "api/internal/domain/wallet"
	v1 "api/pkg/api/season_pass/v1"
)

func (i *Implementation) PurchasePremium(ctx context.Context, _ *v1.PurchasePremiumRequest) (*v1.PurchasePremiumResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	progress, err := i.service.PurchasePremium(ctx, user.ID)
	if err != nil {
		switch {
		case goerr.Is(err, seasonpassdomain.ErrNoActivePass):
			return nil, errors.NotFound("NO_ACTIVE_PASS", "no active season pass")
		case goerr.Is(err, seasonpassdomain.ErrAlreadyPurchased):
			return nil, errors.Conflict("ALREADY_PURCHASED", "premium already active")
		case goerr.Is(err, seasonpassdomain.ErrInsufficientGems),
			goerr.Is(err, walletdomain.ErrInsufficientFunds):
			return nil, errors.BadRequest("INSUFFICIENT_GEMS", "not enough gems")
		default:
			klog.Errorf("season_pass: purchase premium user=%s: %v", user.ID, err)
			return nil, errors.InternalServer("INTERNAL", "failed to purchase premium")
		}
	}
	return &v1.PurchasePremiumResponse{Progress: mapProgress(progress)}, nil
}
