package model

import (
	"time"

	"github.com/google/uuid"
)

type ItemCategory int32

const (
	ItemCategoryUnspecified ItemCategory = 0
	ItemCategoryDecor       ItemCategory = 1
	ItemCategoryCosmetics   ItemCategory = 2
	ItemCategoryAmbient     ItemCategory = 3
	ItemCategoryPets        ItemCategory = 4
	ItemCategoryGuild       ItemCategory = 5
	ItemCategorySeasonal    ItemCategory = 6
)

func (c ItemCategory) String() string {
	switch c {
	case ItemCategoryDecor:
		return "decor"
	case ItemCategoryCosmetics:
		return "cosmetics"
	case ItemCategoryAmbient:
		return "ambient"
	case ItemCategoryPets:
		return "pets"
	case ItemCategoryGuild:
		return "guild"
	case ItemCategorySeasonal:
		return "seasonal"
	}
	return "misc"
}

type ItemRarity int32

const (
	ItemRarityUnspecified ItemRarity = 0
	ItemRarityCommon      ItemRarity = 1
	ItemRarityUncommon    ItemRarity = 2
	ItemRarityRare        ItemRarity = 3
	ItemRarityEpic        ItemRarity = 4
	ItemRarityLegendary   ItemRarity = 5
)

type ItemCurrency int32

const (
	ItemCurrencyUnspecified ItemCurrency = 0
	ItemCurrencyGold        ItemCurrency = 1
	ItemCurrencyGems        ItemCurrency = 2
	ItemCurrencyShards      ItemCurrency = 3
)

// ShopItem is a catalog row.
type ShopItem struct {
	ID          uuid.UUID    `json:"id"`
	Slug        string       `json:"slug"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Category    ItemCategory `json:"category"`
	Rarity      ItemRarity   `json:"rarity"`
	Currency    ItemCurrency `json:"currency"`
	Price       int32        `json:"price"`
	IconRef     string       `json:"iconRef"`
	AccentColor string       `json:"accentColor"`
	IsActive    bool         `json:"isActive"`
	IsSeasonal  bool         `json:"isSeasonal"`
	RotatesAt   *time.Time   `json:"rotatesAt,omitempty"`
	CreatedAt   time.Time    `json:"createdAt"`
	// Slot declares which cosmetic slot the item occupies when equipped
	// (pose/pet/room/ambience/head/body/back/aura/frame). Empty = not
	// equippable.
	Slot string `json:"slot"`
}

// ShopCategoryInfo is one tab on the tavern page with its item count.
type ShopCategoryInfo struct {
	Category  ItemCategory `json:"category"`
	Name      string       `json:"name"`
	ItemCount int32        `json:"itemCount"`
}

// ShopOwnedItem is an inventory entry returned together with its catalog row.
type ShopOwnedItem struct {
	Item       *ShopItem `json:"item"`
	AcquiredAt time.Time `json:"acquiredAt"`
	Equipped   bool      `json:"equipped"`
}

// ShopItemList is the paginated response for ListItems.
type ShopItemList struct {
	Items []*ShopItem `json:"items"`
	Total int32       `json:"total"`
}

// ShopPurchaseOutcome is what Purchase returns: ownership record + what's
// left in the wallet afterwards.
type ShopPurchaseOutcome struct {
	Owned         *ShopOwnedItem `json:"owned"`
	RemainingGold int32          `json:"remainingGold"`
	RemainingGems int32          `json:"remainingGems"`
}
