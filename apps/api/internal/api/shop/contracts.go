package shop

import (
	"context"

	"github.com/google/uuid"

	"api/internal/model"
)

// Service is the interface consumed by transport handlers.
type Service interface {
	ListCategories(ctx context.Context) ([]*model.ShopCategoryInfo, error)
	ListItems(ctx context.Context, category model.ItemCategory, rarity model.ItemRarity, limit, offset int32) (*model.ShopItemList, error)
	GetItem(ctx context.Context, itemID, userID uuid.UUID) (*model.ShopItem, bool, error)
	GetInventory(ctx context.Context, userID uuid.UUID) ([]*model.ShopOwnedItem, error)
	Purchase(ctx context.Context, userID, itemID uuid.UUID) (*model.ShopPurchaseOutcome, error)
	ResolveItem(ctx context.Context, ref string) (uuid.UUID, error)
	Equip(ctx context.Context, userID, itemID uuid.UUID, unequip bool) ([]*model.ShopOwnedItem, error)
}
