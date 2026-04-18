package shop

import (
	"context"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/timestamppb"

	shopdomain "api/internal/domain/shop"
	"api/internal/model"
	v1 "api/pkg/api/shop/v1"
)

type Service interface {
	ListCategories(ctx context.Context) ([]*model.ShopCategoryInfo, error)
	ListItems(ctx context.Context, category model.ItemCategory, rarity model.ItemRarity, limit, offset int32) (*model.ShopItemList, error)
	GetItem(ctx context.Context, itemID, userID uuid.UUID) (*model.ShopItem, bool, error)
	GetInventory(ctx context.Context, userID uuid.UUID) ([]*model.ShopOwnedItem, error)
	Purchase(ctx context.Context, userID, itemID uuid.UUID) (*model.ShopPurchaseOutcome, error)
	ResolveItem(ctx context.Context, ref string) (uuid.UUID, error)
}

type Implementation struct {
	v1.UnimplementedShopServiceServer
	service Service
}

func New(s Service) *Implementation { return &Implementation{service: s} }

func (i *Implementation) GetDescription() grpc.ServiceDesc { return v1.ShopService_ServiceDesc }

// ---------- handlers ----------

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
	if user, ok := model.UserFromContext(ctx); ok && user != nil {
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

func (i *Implementation) GetInventory(ctx context.Context, _ *v1.GetInventoryRequest) (*v1.GetInventoryResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := i.service.GetInventory(ctx, user.ID)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to load inventory")
	}
	out := make([]*v1.OwnedItem, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapOwned(r))
	}
	return &v1.GetInventoryResponse{Items: out}, nil
}

func (i *Implementation) Purchase(ctx context.Context, req *v1.PurchaseRequest) (*v1.PurchaseResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	itemID, err := i.service.ResolveItem(ctx, req.GetItemId())
	if err != nil {
		if goerr.Is(err, shopdomain.ErrItemNotFound) {
			return nil, errors.NotFound("ITEM_NOT_FOUND", "item not found")
		}
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
		case goerr.Is(err, shopdomain.ErrInsufficientFunds):
			return nil, errors.BadRequest("INSUFFICIENT_FUNDS", "not enough currency")
		case goerr.Is(err, shopdomain.ErrUnsupportedCurrency):
			return nil, errors.BadRequest("UNSUPPORTED_CURRENCY", "currency is not supported for purchase")
		case goerr.Is(err, shopdomain.ErrNotForSale):
			return nil, errors.BadRequest("NOT_FOR_SALE", "item is obtained via events, not purchase")
		default:
			return nil, errors.InternalServer("INTERNAL", "failed to complete purchase")
		}
	}
	return &v1.PurchaseResponse{
		Item:           mapOwned(outcome.Owned),
		RemainingGold:  outcome.RemainingGold,
		RemainingGems:  outcome.RemainingGems,
	}, nil
}

// ---------- mapping ----------

func requireUser(ctx context.Context) (*model.User, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok || user == nil {
		return nil, errors.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	return user, nil
}

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
