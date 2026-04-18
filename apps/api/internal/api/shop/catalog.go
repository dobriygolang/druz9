package shop

import (
	"context"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/apihelpers"
	shopdomain "api/internal/domain/shop"
	"api/internal/model"
	v1 "api/pkg/api/shop/v1"
)

func (i *Implementation) ListCategories(ctx context.Context, _ *v1.ListCategoriesRequest) (*v1.ListCategoriesResponse, error) {
	cats, err := i.service.ListCategories(ctx)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list shop categories")
	}
	out := make([]*v1.CategoryInfo, 0, len(cats))
	for _, c := range cats {
		out = append(out, &v1.CategoryInfo{
			Category: v1.ItemCategory(c.Category), Name: c.Name, ItemCount: c.ItemCount,
		})
	}
	return &v1.ListCategoriesResponse{Categories: out}, nil
}

func (i *Implementation) ListItems(ctx context.Context, req *v1.ListItemsRequest) (*v1.ListItemsResponse, error) {
	result, err := i.service.ListItems(
		ctx,
		model.ItemCategory(req.GetCategory()),
		model.ItemRarity(req.GetRarity()),
		req.GetLimit(),
		req.GetOffset(),
	)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list shop items")
	}
	out := make([]*v1.ShopItem, 0, len(result.Items))
	for _, it := range result.Items {
		out = append(out, mapItem(it))
	}
	return &v1.ListItemsResponse{Items: out, Total: result.Total}, nil
}

func (i *Implementation) GetItem(ctx context.Context, req *v1.GetItemRequest) (*v1.GetItemResponse, error) {
	var viewerID uuid.UUID
	if user := apihelpers.OptionalUser(ctx); user != nil {
		viewerID = user.ID
	}
	itemID, err := i.service.ResolveItem(ctx, req.GetItemId())
	if err != nil {
		if goerr.Is(err, shopdomain.ErrItemNotFound) {
			return nil, errors.NotFound("ITEM_NOT_FOUND", "item not found")
		}
		return nil, errors.InternalServer("INTERNAL", "failed to resolve item")
	}
	item, owned, err := i.service.GetItem(ctx, itemID, viewerID)
	if err != nil {
		if goerr.Is(err, shopdomain.ErrItemNotFound) {
			return nil, errors.NotFound("ITEM_NOT_FOUND", "item not found")
		}
		return nil, errors.InternalServer("INTERNAL", "failed to load item")
	}
	return &v1.GetItemResponse{Item: mapItem(item), Owned: owned}, nil
}
