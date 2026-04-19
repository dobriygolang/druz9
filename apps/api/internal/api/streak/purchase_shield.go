package streak

import (
	"context"
	"fmt"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	streakdomain "api/internal/domain/streak"
	v1 "api/pkg/api/streak/v1"
)

func (i *Implementation) PurchaseShield(ctx context.Context, req *v1.PurchaseShieldRequest) (*v1.PurchaseShieldResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	state, count, cost, err := i.service.PurchaseShield(ctx, user.ID, req.GetCount())
	if err != nil {
		return nil, mapStreakErr(err)
	}
	return &v1.PurchaseShieldResponse{
		State:          mapState(state),
		PurchasedCount: count,
		TotalCostGold:  cost,
	}, nil
}

func mapStreakErr(err error) error {
	switch {
	case goerr.Is(err, streakdomain.ErrStreakNotBroken):
		return errors.Conflict("STREAK_NOT_BROKEN", "streak is not broken; no shield needed")
	case goerr.Is(err, streakdomain.ErrNoShieldsOwned):
		return errors.Conflict("NO_SHIELDS", "you own no streak shields")
	case goerr.Is(err, streakdomain.ErrRestoreWindow):
		return errors.Conflict("RESTORE_WINDOW_EXPIRED", "streak is past the restore window")
	case goerr.Is(err, streakdomain.ErrInvalidCount):
		return errors.BadRequest("INVALID_COUNT", "purchase count must be 1..5")
	case goerr.Is(err, streakdomain.ErrInsufficientGold):
		return errors.BadRequest("INSUFFICIENT_GOLD", "not enough gold")
	default:
		return errors.InternalServer("INTERNAL", "streak operation failed")
	}
}
