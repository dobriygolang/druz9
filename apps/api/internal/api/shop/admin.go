package shop

import (
	"context"
	"fmt"
	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/shop/v1"
)

// AdminListItems returns the whole catalog (active + inactive) for the
// admin UI. Delegates to the same service.AdminListItems path so the
// response shape is identical to the public ListItems RPC.
func (i *Implementation) AdminListItems(ctx context.Context, req *v1.AdminListItemsRequest) (*v1.ListItemsResponse, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, fmt.Errorf("require admin: %w", err)
	}
	p := apihelpers.ClampPage(req.GetLimit(), req.GetOffset(), 50, 200)
	list, err := i.service.AdminListItems(ctx, model.ItemCategory(req.GetCategory()), model.ItemRarity(req.GetRarity()), p.Limit, p.Offset)
	if err != nil {
		klog.Errorf("shop: admin list items: %v", err)
		return nil, fmt.Errorf("admin list items: %w", err)
	}
	out := make([]*v1.ShopItem, 0, len(list.Items))
	for _, it := range list.Items {
		out = append(out, mapItem(it))
	}
	return &v1.ListItemsResponse{Items: out, Total: list.Total}, nil
}

func (i *Implementation) AdminCreateItem(ctx context.Context, req *v1.AdminCreateItemRequest) (*v1.ShopItem, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, fmt.Errorf("require admin: %w", err)
	}
	item := &model.ShopItem{
		Slug:        req.GetSlug(),
		Name:        req.GetName(),
		Description: req.GetDescription(),
		Category:    model.ItemCategory(req.GetCategory()),
		Rarity:      model.ItemRarity(req.GetRarity()),
		Currency:    model.ItemCurrency(req.GetCurrency()),
		Price:       req.GetPrice(),
		IconRef:     req.GetIconRef(),
		AccentColor: req.GetAccentColor(),
		IsActive:    req.GetIsActive(),
		IsSeasonal:  req.GetIsSeasonal(),
		Slot:        req.GetSlot(),
	}
	created, err := i.service.AdminCreateItem(ctx, item)
	if err != nil {
		klog.Errorf("shop: admin create item slug=%q: %v", req.GetSlug(), err)
		return nil, fmt.Errorf("admin create item: %w", err)
	}
	return mapItem(created), nil
}

func (i *Implementation) AdminUpdateItem(ctx context.Context, req *v1.AdminUpdateItemRequest) (*v1.ShopItem, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, fmt.Errorf("require admin: %w", err)
	}
	id, err := apihelpers.ParseUUID(req.GetId(), "INVALID_ITEM_ID", "item_id")
	if err != nil {
		return nil, fmt.Errorf("parse item id: %w", err)
	}
	item := &model.ShopItem{
		ID:          id,
		Slug:        req.GetSlug(),
		Name:        req.GetName(),
		Description: req.GetDescription(),
		Category:    model.ItemCategory(req.GetCategory()),
		Rarity:      model.ItemRarity(req.GetRarity()),
		Currency:    model.ItemCurrency(req.GetCurrency()),
		Price:       req.GetPrice(),
		IconRef:     req.GetIconRef(),
		AccentColor: req.GetAccentColor(),
		IsActive:    req.GetIsActive(),
		IsSeasonal:  req.GetIsSeasonal(),
		Slot:        req.GetSlot(),
	}
	updated, err := i.service.AdminUpdateItem(ctx, item)
	if err != nil {
		klog.Errorf("shop: admin update item id=%s: %v", id, err)
		return nil, fmt.Errorf("admin update item: %w", err)
	}
	return mapItem(updated), nil
}

func (i *Implementation) AdminDeleteItem(ctx context.Context, req *v1.AdminDeleteItemRequest) (*v1.AdminDeleteItemResponse, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, fmt.Errorf("require admin: %w", err)
	}
	id, err := apihelpers.ParseUUID(req.GetId(), "INVALID_ITEM_ID", "item_id")
	if err != nil {
		return nil, fmt.Errorf("parse item id: %w", err)
	}
	if err := i.service.AdminDeleteItem(ctx, id); err != nil {
		klog.Errorf("shop: admin delete item id=%s: %v", id, err)
		return nil, fmt.Errorf("admin delete item: %w", err)
	}
	return &v1.AdminDeleteItemResponse{Ok: true}, nil
}
