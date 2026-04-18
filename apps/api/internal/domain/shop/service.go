// Package shop implements the tavern catalog + inventory + purchase flow.
// Wallet debits are optional (service works without them when Wallet is
// nil) so early dev environments don't need full profile-balance wiring.
package shop

import (
	"context"
	"errors"
	"strings"

	"api/internal/model"

	"github.com/google/uuid"
)

const (
	defaultListLimit = 50
	maxListLimit     = 200
)

//go:generate mockery --case underscore --name Repository --with-expecter --output mocks

// Repository is the persistence boundary.
type Repository interface {
	ListItems(ctx context.Context, category model.ItemCategory, rarity model.ItemRarity, limit, offset int32) ([]*model.ShopItem, int32, error)
	ListCategoryCounts(ctx context.Context) (map[model.ItemCategory]int32, error)
	GetItemByID(ctx context.Context, id uuid.UUID) (*model.ShopItem, error)
	GetItemBySlug(ctx context.Context, slug string) (*model.ShopItem, error)
	GetInventory(ctx context.Context, userID uuid.UUID) ([]*model.ShopOwnedItem, error)
	IsOwned(ctx context.Context, userID, itemID uuid.UUID) (bool, error)
	InsertOwnership(ctx context.Context, userID, itemID uuid.UUID, pricePaid int32, currency model.ItemCurrency) (*model.ShopOwnedItem, error)
	// SetEquippedForSlot clears any previously-equipped item in `slot` for
	// the user and optionally sets equipItemID to equipped. Pass uuid.Nil
	// to just clear the slot.
	SetEquippedForSlot(ctx context.Context, userID uuid.UUID, slot string, equipItemID uuid.UUID) ([]*model.ShopOwnedItem, error)

	// Admin surface.
	AdminListItems(ctx context.Context, category model.ItemCategory, rarity model.ItemRarity, limit, offset int32) ([]*model.ShopItem, int32, error)
	InsertItem(ctx context.Context, item *model.ShopItem) (*model.ShopItem, error)
	UpdateItem(ctx context.Context, item *model.ShopItem) (*model.ShopItem, error)
	DeleteItem(ctx context.Context, id uuid.UUID) error
}

//go:generate mockery --case underscore --name Wallet --with-expecter --output mocks

// Wallet debits gold/gems balance on purchase. Profile repo implements this.
type Wallet interface {
	DebitGold(ctx context.Context, userID uuid.UUID, amount int32) error
	DebitGems(ctx context.Context, userID uuid.UUID, amount int32) error
	GetBalance(ctx context.Context, userID uuid.UUID) (gold int32, gems int32, err error)
}

type Config struct {
	Repository Repository
	Wallet     Wallet
}

type Service struct {
	repo   Repository
	wallet Wallet
}

func NewService(c Config) *Service { return &Service{repo: c.Repository, wallet: c.Wallet} }

var (
	ErrItemNotFound       = errors.New("shop: item not found")
	ErrItemInactive       = errors.New("shop: item is no longer for sale")
	ErrAlreadyOwned       = errors.New("shop: item already owned")
	ErrUnsupportedCurrency = errors.New("shop: unsupported currency")
	ErrInsufficientFunds  = errors.New("shop: insufficient funds")
	ErrNotForSale         = errors.New("shop: item has no price (event drop)")
	ErrNotEquippable      = errors.New("shop: item has no slot — cannot be equipped")
	ErrNotOwned           = errors.New("shop: user does not own this item")
)

// CATEGORY_NAMES maps the enum to its canonical name for the
// ListCategories response. Keeping this in the domain (not in the proto
// enum) lets translators localise the display name without regenerating.
var categoryNames = map[model.ItemCategory]string{
	model.ItemCategoryDecor:     "Profile decor",
	model.ItemCategoryCosmetics: "Character cosmetics",
	model.ItemCategoryAmbient:   "Ambient effects",
	model.ItemCategoryPets:      "Companions",
	model.ItemCategoryGuild:     "Guild decor",
	model.ItemCategorySeasonal:  "Seasonal · event",
}

// ListCategories returns one row per category with its active-item count.
func (s *Service) ListCategories(ctx context.Context) ([]*model.ShopCategoryInfo, error) {
	counts, err := s.repo.ListCategoryCounts(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]*model.ShopCategoryInfo, 0, len(categoryNames))
	for cat := model.ItemCategoryDecor; cat <= model.ItemCategorySeasonal; cat++ {
		name, ok := categoryNames[cat]
		if !ok {
			continue
		}
		out = append(out, &model.ShopCategoryInfo{
			Category:  cat,
			Name:      name,
			ItemCount: counts[cat],
		})
	}
	return out, nil
}

// ListItems paginates the catalog. limit/offset are clamped.
func (s *Service) ListItems(
	ctx context.Context,
	category model.ItemCategory, rarity model.ItemRarity,
	limit, offset int32,
) (*model.ShopItemList, error) {
	if limit <= 0 {
		limit = defaultListLimit
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	if offset < 0 {
		offset = 0
	}
	items, total, err := s.repo.ListItems(ctx, category, rarity, limit, offset)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []*model.ShopItem{}
	}
	return &model.ShopItemList{Items: items, Total: total}, nil
}

// GetItem returns one item + whether the viewer already owns it.
func (s *Service) GetItem(ctx context.Context, itemID, userID uuid.UUID) (*model.ShopItem, bool, error) {
	item, err := s.repo.GetItemByID(ctx, itemID)
	if err != nil {
		return nil, false, err
	}
	if item == nil {
		return nil, false, ErrItemNotFound
	}
	owned := false
	if userID != uuid.Nil {
		owned, err = s.repo.IsOwned(ctx, userID, itemID)
		if err != nil {
			return nil, false, err
		}
	}
	return item, owned, nil
}

// GetInventory returns the user's owned items with their catalog rows.
func (s *Service) GetInventory(ctx context.Context, userID uuid.UUID) ([]*model.ShopOwnedItem, error) {
	rows, err := s.repo.GetInventory(ctx, userID)
	if err != nil {
		return nil, err
	}
	if rows == nil {
		rows = []*model.ShopOwnedItem{}
	}
	return rows, nil
}

// Purchase buys one item: validates it's for-sale, checks owners, debits
// the wallet (when wired), records ownership.
func (s *Service) Purchase(ctx context.Context, userID uuid.UUID, itemID uuid.UUID) (*model.ShopPurchaseOutcome, error) {
	item, err := s.repo.GetItemByID(ctx, itemID)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, ErrItemNotFound
	}
	if !item.IsActive {
		return nil, ErrItemInactive
	}
	if item.Price <= 0 {
		return nil, ErrNotForSale
	}

	owned, err := s.repo.IsOwned(ctx, userID, itemID)
	if err != nil {
		return nil, err
	}
	if owned {
		return nil, ErrAlreadyOwned
	}

	// Wallet integration is optional — when nil we skip the debit so dev
	// environments stay unblocked while the profile-wallet service is
	// still behind a feature flag. Callers surface balance via a separate
	// endpoint in that mode.
	if s.wallet != nil {
		switch item.Currency {
		case model.ItemCurrencyGold:
			if err := s.wallet.DebitGold(ctx, userID, item.Price); err != nil {
				return nil, err
			}
		case model.ItemCurrencyGems:
			if err := s.wallet.DebitGems(ctx, userID, item.Price); err != nil {
				return nil, err
			}
		case model.ItemCurrencyShards:
			// Shards aren't on the profile wallet yet; treat as free while
			// the seasonal-shard economy is designed.
		default:
			return nil, ErrUnsupportedCurrency
		}
	}

	owner, err := s.repo.InsertOwnership(ctx, userID, itemID, item.Price, item.Currency)
	if err != nil {
		return nil, err
	}

	outcome := &model.ShopPurchaseOutcome{Owned: owner}
	if s.wallet != nil {
		g, gems, _ := s.wallet.GetBalance(ctx, userID)
		outcome.RemainingGold = g
		outcome.RemainingGems = gems
	}
	return outcome, nil
}

// Equip sets the chosen item as equipped in its slot for the user. If
// another item occupies the same slot it's unequipped atomically. When
// unequip=true the slot is cleared without equipping anything new (the
// item only serves to identify the slot, so it still must be owned).
// Returns the fresh inventory.
func (s *Service) Equip(
	ctx context.Context, userID, itemID uuid.UUID, unequip bool,
) ([]*model.ShopOwnedItem, error) {
	item, err := s.repo.GetItemByID(ctx, itemID)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, ErrItemNotFound
	}
	if item.Slot == "" {
		return nil, ErrNotEquippable
	}
	owned, err := s.repo.IsOwned(ctx, userID, itemID)
	if err != nil {
		return nil, err
	}
	if !owned {
		return nil, ErrNotOwned
	}
	target := itemID
	if unequip {
		target = uuid.Nil
	}
	return s.repo.SetEquippedForSlot(ctx, userID, item.Slot, target)
}

// AdminListItems mirrors ListItems but surfaces inactive rows too.
func (s *Service) AdminListItems(
	ctx context.Context, category model.ItemCategory, rarity model.ItemRarity, limit, offset int32,
) (*model.ShopItemList, error) {
	if limit <= 0 {
		limit = defaultListLimit
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	if offset < 0 {
		offset = 0
	}
	items, total, err := s.repo.AdminListItems(ctx, category, rarity, limit, offset)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []*model.ShopItem{}
	}
	return &model.ShopItemList{Items: items, Total: total}, nil
}

func (s *Service) AdminCreateItem(ctx context.Context, item *model.ShopItem) (*model.ShopItem, error) {
	if item == nil {
		return nil, errors.New("shop: nil item")
	}
	if strings.TrimSpace(item.Slug) == "" {
		return nil, errors.New("shop: slug is required")
	}
	if item.ID == uuid.Nil {
		item.ID = uuid.New()
	}
	return s.repo.InsertItem(ctx, item)
}

func (s *Service) AdminUpdateItem(ctx context.Context, item *model.ShopItem) (*model.ShopItem, error) {
	if item == nil || item.ID == uuid.Nil {
		return nil, ErrItemNotFound
	}
	return s.repo.UpdateItem(ctx, item)
}

func (s *Service) AdminDeleteItem(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return ErrItemNotFound
	}
	return s.repo.DeleteItem(ctx, id)
}

// Used by API layer if a client passes a slug instead of a UUID.
func (s *Service) ResolveItem(ctx context.Context, ref string) (uuid.UUID, error) {
	if id, err := uuid.Parse(ref); err == nil {
		return id, nil
	}
	if strings.TrimSpace(ref) == "" {
		return uuid.Nil, ErrItemNotFound
	}
	item, err := s.repo.GetItemBySlug(ctx, ref)
	if err != nil {
		return uuid.Nil, err
	}
	if item == nil {
		return uuid.Nil, ErrItemNotFound
	}
	return item.ID, nil
}
