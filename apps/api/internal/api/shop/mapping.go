package shop

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/model"
	v1 "api/pkg/api/shop/v1"
)

func mapItem(it *model.ShopItem) *v1.ShopItem {
	if it == nil {
		return nil
	}
	out := &v1.ShopItem{
		Id:          it.ID.String(),
		Slug:        it.Slug,
		Name:        it.Name,
		Description: it.Description,
		Category:    v1.ItemCategory(it.Category),
		Rarity:      v1.ItemRarity(it.Rarity),
		Currency:    v1.ItemCurrency(it.Currency),
		Price:       it.Price,
		IconRef:     it.IconRef,
		AccentColor: it.AccentColor,
		IsActive:    it.IsActive,
		IsSeasonal:  it.IsSeasonal,
		Slot:        it.Slot,
	}
	if it.RotatesAt != nil {
		out.RotatesAt = timestamppb.New(*it.RotatesAt)
	}
	return out
}

func mapOwned(r *model.ShopOwnedItem) *v1.OwnedItem {
	if r == nil {
		return nil
	}
	return &v1.OwnedItem{
		Item:       mapItem(r.Item),
		AcquiredAt: timestamppb.New(r.AcquiredAt),
		Equipped:   r.Equipped,
	}
}
