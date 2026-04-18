package shop

import (
	"context"
	"errors"
	"fmt"

	"api/internal/model"
	"api/internal/storage/postgres"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(store *postgres.Store, logger log.Logger) *Repo {
	return &Repo{data: store, log: log.NewHelper(logger)}
}

const itemSelectCols = `
    id, slug, name, description, category, rarity, currency, price,
    icon_ref, accent_color, is_active, is_seasonal, rotates_at, created_at
`

// ListItems returns active items filtered by category + rarity. Both
// filters are optional; 0 / UNSPECIFIED means "any".
func (r *Repo) ListItems(
	ctx context.Context,
	category model.ItemCategory, rarity model.ItemRarity,
	limit, offset int32,
) ([]*model.ShopItem, int32, error) {
	// Dynamic WHERE with a fixed 2-filter surface keeps the SQL simple;
	// fmt.Sprintf is safe here because both filters are enum ints, not
	// user input strings.
	where := "is_active = TRUE"
	args := []any{}
	idx := 1
	if category != model.ItemCategoryUnspecified {
		where += fmt.Sprintf(" AND category = $%d", idx)
		args = append(args, int16(category))
		idx++
	}
	if rarity != model.ItemRarityUnspecified {
		where += fmt.Sprintf(" AND rarity = $%d", idx)
		args = append(args, int16(rarity))
		idx++
	}

	listArgs := append([]any{}, args...)
	listArgs = append(listArgs, limit, offset)
	query := fmt.Sprintf(`
        SELECT %s FROM shop_items WHERE %s
        ORDER BY rarity DESC, price DESC, created_at DESC
        LIMIT $%d OFFSET $%d
    `, itemSelectCols, where, idx, idx+1)

	rows, err := r.data.DB.Query(ctx, query, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("list items: %w", err)
	}
	defer rows.Close()

	items := make([]*model.ShopItem, 0, limit)
	for rows.Next() {
		it, err := scanItem(rows)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, it)
	}

	var total int32
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM shop_items WHERE %s`, where)
	if err := r.data.DB.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count items: %w", err)
	}
	return items, total, nil
}

// ListCategoryCounts aggregates item counts per category in one query.
func (r *Repo) ListCategoryCounts(ctx context.Context) (map[model.ItemCategory]int32, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT category, COUNT(*) FROM shop_items WHERE is_active = TRUE GROUP BY category
    `)
	if err != nil {
		return nil, fmt.Errorf("count by category: %w", err)
	}
	defer rows.Close()

	out := make(map[model.ItemCategory]int32, 6)
	for rows.Next() {
		var c int16
		var n int32
		if err := rows.Scan(&c, &n); err != nil {
			return nil, err
		}
		out[model.ItemCategory(c)] = n
	}
	return out, rows.Err()
}

func (r *Repo) GetItemByID(ctx context.Context, id uuid.UUID) (*model.ShopItem, error) {
	row := r.data.DB.QueryRow(ctx, `SELECT `+itemSelectCols+` FROM shop_items WHERE id = $1`, id)
	it, err := scanItem(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get item: %w", err)
	}
	return it, nil
}

func (r *Repo) GetItemBySlug(ctx context.Context, slug string) (*model.ShopItem, error) {
	row := r.data.DB.QueryRow(ctx, `SELECT `+itemSelectCols+` FROM shop_items WHERE slug = $1`, slug)
	it, err := scanItem(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get item by slug: %w", err)
	}
	return it, nil
}

// GetInventory joins user_shop_inventory with shop_items so callers get
// the full catalog row alongside the ownership record.
func (r *Repo) GetInventory(ctx context.Context, userID uuid.UUID) ([]*model.ShopOwnedItem, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT `+itemSelectCols+`, inv.acquired_at, inv.equipped
        FROM user_shop_inventory inv
        JOIN shop_items ON shop_items.id = inv.item_id
        WHERE inv.user_id = $1
        ORDER BY inv.acquired_at DESC
    `, userID)
	if err != nil {
		return nil, fmt.Errorf("get inventory: %w", err)
	}
	defer rows.Close()

	result := make([]*model.ShopOwnedItem, 0, 16)
	for rows.Next() {
		it := &model.ShopItem{}
		owned := &model.ShopOwnedItem{Item: it}
		var category, rarity, currency int16
		// Scan order matches itemSelectCols + (acquired_at, equipped).
		if err := rows.Scan(
			&it.ID, &it.Slug, &it.Name, &it.Description, &category, &rarity, &currency,
			&it.Price, &it.IconRef, &it.AccentColor, &it.IsActive, &it.IsSeasonal, &it.RotatesAt, &it.CreatedAt,
			&owned.AcquiredAt, &owned.Equipped,
		); err != nil {
			return nil, fmt.Errorf("scan inventory row: %w", err)
		}
		it.Category = model.ItemCategory(category)
		it.Rarity = model.ItemRarity(rarity)
		it.Currency = model.ItemCurrency(currency)
		result = append(result, owned)
	}
	return result, rows.Err()
}

func (r *Repo) IsOwned(ctx context.Context, userID, itemID uuid.UUID) (bool, error) {
	var exists bool
	err := r.data.DB.QueryRow(ctx, `
        SELECT EXISTS(
            SELECT 1 FROM user_shop_inventory
            WHERE user_id = $1 AND item_id = $2
        )
    `, userID, itemID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("is owned: %w", err)
	}
	return exists, nil
}

func (r *Repo) InsertOwnership(
	ctx context.Context, userID, itemID uuid.UUID, pricePaid int32, currency model.ItemCurrency,
) (*model.ShopOwnedItem, error) {
	_, err := r.data.DB.Exec(ctx, `
        INSERT INTO user_shop_inventory (user_id, item_id, price_paid, currency)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, item_id) DO NOTHING
    `, userID, itemID, pricePaid, int16(currency))
	if err != nil {
		return nil, fmt.Errorf("insert ownership: %w", err)
	}

	// Re-fetch so the caller sees acquired_at exactly as DB recorded it.
	item, err := r.GetItemByID(ctx, itemID)
	if err != nil {
		return nil, err
	}
	owned := &model.ShopOwnedItem{Item: item}
	if err := r.data.DB.QueryRow(ctx, `
        SELECT acquired_at, equipped FROM user_shop_inventory
        WHERE user_id = $1 AND item_id = $2
    `, userID, itemID).Scan(&owned.AcquiredAt, &owned.Equipped); err != nil {
		return nil, fmt.Errorf("load inserted ownership: %w", err)
	}
	return owned, nil
}

type scanner interface{ Scan(dest ...any) error }

func scanItem(s scanner) (*model.ShopItem, error) {
	it := &model.ShopItem{}
	var category, rarity, currency int16
	err := s.Scan(
		&it.ID, &it.Slug, &it.Name, &it.Description, &category, &rarity, &currency,
		&it.Price, &it.IconRef, &it.AccentColor, &it.IsActive, &it.IsSeasonal, &it.RotatesAt, &it.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	it.Category = model.ItemCategory(category)
	it.Rarity = model.ItemRarity(rarity)
	it.Currency = model.ItemCurrency(currency)
	return it, nil
}
