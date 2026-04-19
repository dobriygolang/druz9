package inbox

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// GiftRow mirrors the user_gifts table joined with shop_items for the
// item_name/icon and users for the sender display name.
type GiftRow struct {
	ID            uuid.UUID
	SenderID      uuid.UUID
	SenderName    string
	RecipientID   uuid.UUID
	ItemID        uuid.UUID
	ItemName      string
	ItemIconRef   string
	Note          string
	Status        string
	SentAt        time.Time
	DecidedAt     *time.Time
}

var (
	ErrGiftItemNotOwned = errors.New("gift: sender does not own this item")
	ErrGiftNotFound     = errors.New("gift: not found")
	ErrGiftNotPending   = errors.New("gift: not pending")
)

// SendGift creates a 'pending' gift after verifying the sender owns the
// item AND the item isn't currently equipped (equipped items would leave
// the user with a half-applied cosmetic). One transaction so the check +
// insert can't race against an Equip call.
func (r *Repo) SendGift(ctx context.Context, senderID, recipientID, itemID uuid.UUID, note string) (*GiftRow, error) {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("send gift begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var equipped bool
	err = tx.QueryRow(ctx, `
        SELECT equipped FROM user_shop_inventory
        WHERE user_id = $1 AND item_id = $2 FOR UPDATE
    `, senderID, itemID).Scan(&equipped)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrGiftItemNotOwned
	}
	if err != nil {
		return nil, fmt.Errorf("send gift verify: %w", err)
	}
	if equipped {
		return nil, fmt.Errorf("gift: item is currently equipped — unequip before sending")
	}

	var giftID uuid.UUID
	var sentAt time.Time
	err = tx.QueryRow(ctx, `
        INSERT INTO user_gifts (sender_id, recipient_id, item_id, note)
        VALUES ($1, $2, $3, $4)
        RETURNING id, sent_at
    `, senderID, recipientID, itemID, note).Scan(&giftID, &sentAt)
	if err != nil {
		return nil, fmt.Errorf("send gift insert: %w", err)
	}

	// Remove from sender inventory immediately so they can't double-gift
	// the same item. Recipient claims to gain ownership; decline returns it.
	if _, err := tx.Exec(ctx, `
        DELETE FROM user_shop_inventory WHERE user_id = $1 AND item_id = $2
    `, senderID, itemID); err != nil {
		return nil, fmt.Errorf("send gift remove from sender: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("send gift commit: %w", err)
	}
	return r.GetGift(ctx, giftID)
}

// ClaimGift moves the item into the recipient's inventory. Idempotent
// for already-claimed gifts (returns the existing row).
func (r *Repo) ClaimGift(ctx context.Context, recipientID, giftID uuid.UUID) (*GiftRow, error) {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("claim gift begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var senderID, itemID uuid.UUID
	var status string
	err = tx.QueryRow(ctx, `
        SELECT sender_id, item_id, status FROM user_gifts
        WHERE id = $1 AND recipient_id = $2 FOR UPDATE
    `, giftID, recipientID).Scan(&senderID, &itemID, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrGiftNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("claim gift lookup: %w", err)
	}
	if status == "claimed" {
		return r.GetGift(ctx, giftID)
	}
	if status != "pending" {
		return nil, ErrGiftNotPending
	}

	if _, err := tx.Exec(ctx, `
        INSERT INTO user_shop_inventory (user_id, item_id, equipped, acquired_at)
        VALUES ($1, $2, FALSE, NOW())
        ON CONFLICT (user_id, item_id) DO NOTHING
    `, recipientID, itemID); err != nil {
		return nil, fmt.Errorf("claim gift inventory: %w", err)
	}
	if _, err := tx.Exec(ctx, `
        UPDATE user_gifts SET status='claimed', decided_at=NOW() WHERE id = $1
    `, giftID); err != nil {
		return nil, fmt.Errorf("claim gift status: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("claim gift commit: %w", err)
	}
	_ = senderID
	return r.GetGift(ctx, giftID)
}

// DeclineGift returns the item to the sender's inventory.
func (r *Repo) DeclineGift(ctx context.Context, recipientID, giftID uuid.UUID) (*GiftRow, error) {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("decline gift begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var senderID, itemID uuid.UUID
	var status string
	err = tx.QueryRow(ctx, `
        SELECT sender_id, item_id, status FROM user_gifts
        WHERE id = $1 AND recipient_id = $2 FOR UPDATE
    `, giftID, recipientID).Scan(&senderID, &itemID, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrGiftNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("decline gift lookup: %w", err)
	}
	if status != "pending" {
		return nil, ErrGiftNotPending
	}

	if _, err := tx.Exec(ctx, `
        INSERT INTO user_shop_inventory (user_id, item_id, equipped, acquired_at)
        VALUES ($1, $2, FALSE, NOW())
        ON CONFLICT (user_id, item_id) DO NOTHING
    `, senderID, itemID); err != nil {
		return nil, fmt.Errorf("decline gift restore: %w", err)
	}
	if _, err := tx.Exec(ctx, `
        UPDATE user_gifts SET status='declined', decided_at=NOW() WHERE id = $1
    `, giftID); err != nil {
		return nil, fmt.Errorf("decline gift status: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("decline gift commit: %w", err)
	}
	return r.GetGift(ctx, giftID)
}

func (r *Repo) GetGift(ctx context.Context, giftID uuid.UUID) (*GiftRow, error) {
	row := r.data.DB.QueryRow(ctx, giftSelectSQL+` WHERE g.id = $1`, giftID)
	g := &GiftRow{}
	if err := scanGift(row, g); err != nil {
		return nil, err
	}
	return g, nil
}

// ListGifts: side='received' filters by recipient_id; 'sent' by sender_id.
// Pass status="" for all statuses.
func (r *Repo) ListGifts(ctx context.Context, side string, userID uuid.UUID, status string) ([]*GiftRow, error) {
	idCol := "g.recipient_id"
	if side == "sent" {
		idCol = "g.sender_id"
	}
	q := giftSelectSQL + " WHERE " + idCol + " = $1"
	args := []any{userID}
	if status != "" {
		q += " AND g.status = $2"
		args = append(args, status)
	}
	q += " ORDER BY g.sent_at DESC LIMIT 100"

	rows, err := r.data.DB.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("list gifts: %w", err)
	}
	defer rows.Close()
	out := make([]*GiftRow, 0, 16)
	for rows.Next() {
		g := &GiftRow{}
		if err := scanGift(rows, g); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

const giftSelectSQL = `
SELECT g.id, g.sender_id,
       COALESCE(NULLIF(TRIM(CONCAT_WS(' ', su.first_name, su.last_name)), ''), NULLIF(su.username, ''), 'Unknown'),
       g.recipient_id, g.item_id, s.name, COALESCE(s.icon_ref, ''),
       g.note, g.status, g.sent_at, g.decided_at
FROM user_gifts g
JOIN users su ON su.id = g.sender_id
JOIN shop_items s ON s.id = g.item_id
`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanGift(row rowScanner, g *GiftRow) error {
	if err := row.Scan(
		&g.ID, &g.SenderID, &g.SenderName,
		&g.RecipientID, &g.ItemID, &g.ItemName, &g.ItemIconRef,
		&g.Note, &g.Status, &g.SentAt, &g.DecidedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrGiftNotFound
		}
		return fmt.Errorf("scan gift: %w", err)
	}
	return nil
}
