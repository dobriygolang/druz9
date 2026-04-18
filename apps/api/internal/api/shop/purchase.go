package shop

import (
	"context"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/apihelpers"
	shopdomain "api/internal/domain/shop"
	walletdomain "api/internal/domain/wallet"
	v1 "api/pkg/api/shop/v1"
)

func (i *Implementation) Purchase(ctx context.Context, req *v1.PurchaseRequest) (*v1.PurchaseResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	itemID, err := i.service.ResolveItem(ctx, req.GetItemId())
	if err != nil {
		if goerr.Is(err, shopdomain.ErrItemNotFound) {
			return nil, errors.NotFound("ITEM_NOT_FOUND", "item not found")
		}
		klog.Errorf("shop: resolve item ref=%q user=%s: %v", req.GetItemId(), user.ID, err)
		return nil, errors.InternalServer("INTERNAL", "failed to resolve item")
	}
	outcome, err := i.service.Purchase(ctx, user.ID, itemID)
	if err != nil {
		switch {
		case goerr.Is(err, shopdomain.ErrItemNotFound):
			return nil, errors.NotFound("ITEM_NOT_FOUND", "item not found")
		case goerr.Is(err, shopdomain.ErrItemInactive):
			return nil, errors.Conflict("ITEM_INACTIVE", "item is no longer for sale")
		case goerr.Is(err, shopdomain.ErrAlreadyOwned):
			return nil, errors.Conflict("ALREADY_OWNED", "you already own this item")
		// Two separate sentinels exist: shopdomain.ErrInsufficientFunds
		// (if the shop service errors out before the wallet is touched)
		// and walletdomain.ErrInsufficientFunds (wrapped by
		// wallet.mapFundsErr when the actual debit fails). Catch both
		// so the client always sees 400 INSUFFICIENT_FUNDS instead of
		// a red 500 "internal" toast.
		case goerr.Is(err, shopdomain.ErrInsufficientFunds), goerr.Is(err, walletdomain.ErrInsufficientFunds):
			return nil, errors.BadRequest("INSUFFICIENT_FUNDS", "not enough currency")
		case goerr.Is(err, shopdomain.ErrUnsupportedCurrency):
			return nil, errors.BadRequest("UNSUPPORTED_CURRENCY", "currency is not supported for purchase")
		case goerr.Is(err, shopdomain.ErrNotForSale):
			return nil, errors.BadRequest("NOT_FOR_SALE", "item is obtained via events, not purchase")
		default:
			klog.Errorf("shop: purchase item=%s user=%s: %v", itemID, user.ID, err)
			return nil, errors.InternalServer("INTERNAL", "failed to complete purchase")
		}
	}
	return &v1.PurchaseResponse{
		Item:          mapOwned(outcome.Owned),
		RemainingGold: outcome.RemainingGold,
		RemainingGems: outcome.RemainingGems,
	}, nil
}
