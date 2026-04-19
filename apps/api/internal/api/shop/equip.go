package shop

import (
	"context"
	goerr "errors"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/apihelpers"
	shopdomain "api/internal/domain/shop"
	v1 "api/pkg/api/shop/v1"
)

func (i *Implementation) EquipCosmetic(ctx context.Context, req *v1.EquipCosmeticRequest) (*v1.EquipCosmeticResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	itemID, err := i.service.ResolveItem(ctx, req.GetItemId())
	if err != nil {
		if goerr.Is(err, shopdomain.ErrItemNotFound) {
			return nil, errors.NotFound("ITEM_NOT_FOUND", "item not found")
		}
		klog.Errorf("shop: equip resolve item ref=%q user=%s: %v", req.GetItemId(), user.ID, err)
		return nil, errors.InternalServer("INTERNAL", "failed to resolve item")
	}
	rows, err := i.service.Equip(ctx, user.ID, itemID, req.GetUnequip())
	if err != nil {
		switch {
		case goerr.Is(err, shopdomain.ErrItemNotFound):
			return nil, errors.NotFound("ITEM_NOT_FOUND", "item not found")
		case goerr.Is(err, shopdomain.ErrNotEquippable):
			return nil, errors.BadRequest("NOT_EQUIPPABLE", "item has no slot")
		case goerr.Is(err, shopdomain.ErrNotOwned):
			return nil, errors.Forbidden("NOT_OWNED", "you do not own this item")
		default:
			klog.Errorf("shop: equip item=%s user=%s unequip=%v: %v", itemID, user.ID, req.GetUnequip(), err)
			return nil, errors.InternalServer("INTERNAL", "failed to equip item")
		}
	}
	out := make([]*v1.OwnedItem, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapOwned(r))
	}
	return &v1.EquipCosmeticResponse{Items: out}, nil
}
