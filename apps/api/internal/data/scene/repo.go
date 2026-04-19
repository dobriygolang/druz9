// Package scene persists composition layouts (Hero Room / Guild Hall) — see ADR-003.
package scene

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"api/internal/storage/postgres"
)

// Scope discriminates between layout owners.
type Scope string

const (
	ScopeUserRoom  Scope = "user_room"
	ScopeGuildHall Scope = "guild_hall"
)

// PlacedItem mirrors v1.PlacedItem at the data-layer boundary so the repo
// has no dependency on generated proto types.
type PlacedItem struct {
	ItemID      uuid.UUID
	X, Y        float64
	Scale       float64
	RotationDeg float64
	ZIndex      int32
	Flipped     bool
}

type Layout struct {
	ID            uuid.UUID
	Scope         Scope
	OwnerID       uuid.UUID
	Width         int32
	Height        int32
	BackgroundRef string
	Items         []PlacedItem
	UpdatedAt     time.Time
}

// ErrLayoutNotFound — caller may treat as "create empty default".
var ErrLayoutNotFound = errors.New("scene layout not found")

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(store *postgres.Store, logger log.Logger) *Repo {
	return &Repo{data: store, log: log.NewHelper(logger)}
}

// Get returns the layout for (scope, ownerID) or ErrLayoutNotFound.
func (r *Repo) Get(ctx context.Context, scope Scope, ownerID uuid.UUID) (*Layout, error) {
	row := r.data.DB.QueryRow(ctx, `
        SELECT id, scope, owner_id, width, height, background_ref, updated_at
        FROM scene_layouts
        WHERE scope = $1 AND owner_id = $2
    `, string(scope), ownerID)

	l := &Layout{}
	var scopeStr string
	if err := row.Scan(&l.ID, &scopeStr, &l.OwnerID, &l.Width, &l.Height, &l.BackgroundRef, &l.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrLayoutNotFound
		}
		return nil, fmt.Errorf("scene get layout: %w", err)
	}
	l.Scope = Scope(scopeStr)

	items, err := r.listItems(ctx, l.ID)
	if err != nil {
		return nil, err
	}
	l.Items = items
	return l, nil
}

func (r *Repo) listItems(ctx context.Context, layoutID uuid.UUID) ([]PlacedItem, error) {
	rows, err := r.data.DB.Query(ctx, `
        SELECT item_id, x, y, scale, rotation_deg, z_index, flipped
        FROM scene_placed_items
        WHERE layout_id = $1
        ORDER BY z_index ASC, item_id ASC
    `, layoutID)
	if err != nil {
		return nil, fmt.Errorf("scene list items: %w", err)
	}
	defer rows.Close()

	out := make([]PlacedItem, 0, 16)
	for rows.Next() {
		var it PlacedItem
		if err := rows.Scan(&it.ItemID, &it.X, &it.Y, &it.Scale, &it.RotationDeg, &it.ZIndex, &it.Flipped); err != nil {
			return nil, fmt.Errorf("scene scan item: %w", err)
		}
		out = append(out, it)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate items: %w", err)
	}
	return out, nil
}

// Upsert replaces the layout atomically: layout row is upserted by
// (scope, owner_id), then items are wiped and re-inserted. Caller is
// responsible for validating that updatedBy is allowed to edit and that
// every item belongs to the owner (ownership check happens in the service
// layer where domain-aware lookups live).
func (r *Repo) Upsert(
	ctx context.Context,
	scope Scope,
	ownerID, updatedBy uuid.UUID,
	width, height int32,
	backgroundRef string,
	items []PlacedItem,
) (*Layout, error) {
	if width <= 0 || height <= 0 {
		return nil, fmt.Errorf("scene upsert: invalid canvas size %dx%d", width, height)
	}

	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("scene upsert begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var layoutID uuid.UUID
	var updatedAt time.Time
	err = tx.QueryRow(ctx, `
        INSERT INTO scene_layouts (scope, owner_id, width, height, background_ref, updated_by, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (scope, owner_id) DO UPDATE
            SET width = EXCLUDED.width,
                height = EXCLUDED.height,
                background_ref = EXCLUDED.background_ref,
                updated_by = EXCLUDED.updated_by,
                updated_at = NOW()
        RETURNING id, updated_at
    `, string(scope), ownerID, width, height, backgroundRef, updatedBy).Scan(&layoutID, &updatedAt)
	if err != nil {
		return nil, fmt.Errorf("scene upsert layout: %w", err)
	}

	if _, err := tx.Exec(ctx, `DELETE FROM scene_placed_items WHERE layout_id = $1`, layoutID); err != nil {
		return nil, fmt.Errorf("scene clear items: %w", err)
	}

	if len(items) > 0 {
		batch := &pgx.Batch{}
		for _, it := range items {
			if it.Scale <= 0 {
				return nil, fmt.Errorf("scene upsert: scale must be > 0 (got %v)", it.Scale)
			}
			batch.Queue(`
                INSERT INTO scene_placed_items
                    (layout_id, item_id, x, y, scale, rotation_deg, z_index, flipped)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, layoutID, it.ItemID, it.X, it.Y, it.Scale, it.RotationDeg, it.ZIndex, it.Flipped)
		}
		br := tx.SendBatch(ctx, batch)
		for range items {
			if _, err := br.Exec(); err != nil {
				_ = br.Close()
				return nil, fmt.Errorf("scene insert item: %w", err)
			}
		}
		if err := br.Close(); err != nil {
			return nil, fmt.Errorf("scene close batch: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("scene upsert commit: %w", err)
	}

	return &Layout{
		ID:            layoutID,
		Scope:         scope,
		OwnerID:       ownerID,
		Width:         width,
		Height:        height,
		BackgroundRef: backgroundRef,
		Items:         append([]PlacedItem(nil), items...),
		UpdatedAt:     updatedAt,
	}, nil
}

// UserOwnsItems returns the subset of itemIDs that the user actually owns
// (and has not had revoked). Caller compares lengths to decide if the
// request is valid.
func (r *Repo) UserOwnsItems(ctx context.Context, userID uuid.UUID, itemIDs []uuid.UUID) (map[uuid.UUID]bool, error) {
	owned := make(map[uuid.UUID]bool, len(itemIDs))
	if len(itemIDs) == 0 {
		return owned, nil
	}
	rows, err := r.data.DB.Query(ctx, `
        SELECT item_id FROM user_shop_inventory WHERE user_id = $1 AND item_id = ANY($2)
    `, userID, itemIDs)
	if err != nil {
		return nil, fmt.Errorf("scene check user ownership: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan user ownership: %w", err)
		}
		owned[id] = true
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user ownership: %w", err)
	}
	return owned, nil
}

// GuildOwnsItems mirrors UserOwnsItems for guild_inventory (added in 00024).
func (r *Repo) GuildOwnsItems(ctx context.Context, guildID uuid.UUID, itemIDs []uuid.UUID) (map[uuid.UUID]bool, error) {
	owned := make(map[uuid.UUID]bool, len(itemIDs))
	if len(itemIDs) == 0 {
		return owned, nil
	}
	rows, err := r.data.DB.Query(ctx, `
        SELECT item_id FROM guild_inventory WHERE guild_id = $1 AND item_id = ANY($2)
    `, guildID, itemIDs)
	if err != nil {
		return nil, fmt.Errorf("scene check guild ownership: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan guild ownership: %w", err)
		}
		owned[id] = true
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate guild ownership: %w", err)
	}
	return owned, nil
}
