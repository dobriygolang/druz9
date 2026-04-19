package inbox

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type TradeRow struct {
	ID                  uuid.UUID
	InitiatorID         uuid.UUID
	InitiatorName       string
	CounterpartyID      uuid.UUID
	InitiatorItemID     uuid.UUID
	InitiatorItemName   string
	InitiatorItemIcon   string
	CounterpartyItemID  uuid.UUID
	CounterpartyItemName string
	CounterpartyItemIcon string
	Note                string
	Status              string
	ProposedAt          time.Time
	DecidedAt           *time.Time
}

var (
	ErrTradeNotFound        = errors.New("trade: not found")
	ErrTradeNotPending      = errors.New("trade: not pending")
	ErrTradeItemNotOwned    = errors.New("trade: item not owned by required side")
	ErrTradeItemEquipped    = errors.New("trade: item is currently equipped")
	ErrTradeSelf            = errors.New("trade: cannot trade with yourself")
)

// ProposeTrade verifies initiator owns initiator_item and counterparty
// owns counterparty_item; both must be unequipped. Pending row is
// inserted; items stay in inventories until accept (atomic swap) or
// cancel (no-op).
func (r *Repo) ProposeTrade(ctx context.Context, initiatorID, counterpartyID, initiatorItemID, counterpartyItemID uuid.UUID, note string) (*TradeRow, error) {
	if initiatorID == counterpartyID {
		return nil, fmt.Errorf("propose trade: %w", ErrTradeSelf)
	}
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("trade begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := assertOwnedAndUnequipped(ctx, tx, initiatorID, initiatorItemID); err != nil {
		return nil, err
	}
	if err := assertOwnedAndUnequipped(ctx, tx, counterpartyID, counterpartyItemID); err != nil {
		return nil, err
	}

	var tradeID uuid.UUID
	err = tx.QueryRow(ctx, `
        INSERT INTO user_trades (initiator_id, counterparty_id, initiator_item_id, counterparty_item_id, note)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    `, initiatorID, counterpartyID, initiatorItemID, counterpartyItemID, note).Scan(&tradeID)
	if err != nil {
		return nil, fmt.Errorf("trade insert: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("trade commit: %w", err)
	}
	return r.GetTrade(ctx, tradeID)
}

func assertOwnedAndUnequipped(ctx context.Context, tx pgx.Tx, userID, itemID uuid.UUID) error {
	var equipped bool
	err := tx.QueryRow(ctx, `
        SELECT equipped FROM user_shop_inventory
        WHERE user_id = $1 AND item_id = $2
    `, userID, itemID).Scan(&equipped)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrTradeItemNotOwned
	}
	if err != nil {
		return fmt.Errorf("trade ownership check: %w", err)
	}
	if equipped {
		return ErrTradeItemEquipped
	}
	return nil
}

// AcceptTrade atomically swaps the items between both inventories.
// Re-checks ownership inside the transaction so a race with Equip /
// SendGift cancels cleanly. Caller must be the counterparty.
func (r *Repo) AcceptTrade(ctx context.Context, counterpartyID, tradeID uuid.UUID) (*TradeRow, error) {
	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("trade accept begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var initiatorID, initiatorItemID, counterpartyItemID uuid.UUID
	var status string
	err = tx.QueryRow(ctx, `
        SELECT initiator_id, initiator_item_id, counterparty_item_id, status
        FROM user_trades WHERE id = $1 AND counterparty_id = $2 FOR UPDATE
    `, tradeID, counterpartyID).Scan(&initiatorID, &initiatorItemID, &counterpartyItemID, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrTradeNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("trade accept lookup: %w", err)
	}
	if status != "pending" {
		return nil, ErrTradeNotPending
	}

	if err := assertOwnedAndUnequipped(ctx, tx, initiatorID, initiatorItemID); err != nil {
		return nil, err
	}
	if err := assertOwnedAndUnequipped(ctx, tx, counterpartyID, counterpartyItemID); err != nil {
		return nil, err
	}

	// Swap: delete old rows, insert new ones. ON CONFLICT DO NOTHING is
	// safe — both items move to fresh owners.
	if _, err := tx.Exec(ctx, `
        DELETE FROM user_shop_inventory WHERE (user_id, item_id) IN (($1, $2), ($3, $4))
    `, initiatorID, initiatorItemID, counterpartyID, counterpartyItemID); err != nil {
		return nil, fmt.Errorf("trade swap delete: %w", err)
	}
	if _, err := tx.Exec(ctx, `
        INSERT INTO user_shop_inventory (user_id, item_id, equipped, acquired_at)
        VALUES ($1, $2, FALSE, NOW()), ($3, $4, FALSE, NOW())
        ON CONFLICT (user_id, item_id) DO NOTHING
    `, initiatorID, counterpartyItemID, counterpartyID, initiatorItemID); err != nil {
		return nil, fmt.Errorf("trade swap insert: %w", err)
	}
	if _, err := tx.Exec(ctx, `
        UPDATE user_trades SET status='accepted', decided_at=NOW() WHERE id = $1
    `, tradeID); err != nil {
		return nil, fmt.Errorf("trade swap status: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("trade swap commit: %w", err)
	}
	return r.GetTrade(ctx, tradeID)
}

// CancelTrade marks pending → cancelled. Initiator AND counterparty are
// both allowed to cancel; we don't enforce side here (caller's choice).
func (r *Repo) CancelTrade(ctx context.Context, actorID, tradeID uuid.UUID) (*TradeRow, error) {
	tag, err := r.data.DB.Exec(ctx, `
        UPDATE user_trades
        SET status='cancelled', decided_at=NOW()
        WHERE id = $1 AND (initiator_id = $2 OR counterparty_id = $2) AND status = 'pending'
    `, tradeID, actorID)
	if err != nil {
		return nil, fmt.Errorf("trade cancel: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, ErrTradeNotFound
	}
	return r.GetTrade(ctx, tradeID)
}

func (r *Repo) GetTrade(ctx context.Context, tradeID uuid.UUID) (*TradeRow, error) {
	row := r.data.DB.QueryRow(ctx, tradeSelectSQL+` WHERE t.id = $1`, tradeID)
	t := &TradeRow{}
	if err := scanTrade(row, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (r *Repo) ListTrades(ctx context.Context, side string, userID uuid.UUID, status string) ([]*TradeRow, error) {
	idCol := "t.counterparty_id"
	if side == "sent" {
		idCol = "t.initiator_id"
	}
	q := tradeSelectSQL + " WHERE " + idCol + " = $1"
	args := []any{userID}
	if status != "" {
		q += " AND t.status = $2"
		args = append(args, status)
	}
	q += " ORDER BY t.proposed_at DESC LIMIT 100"

	rows, err := r.data.DB.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("list trades: %w", err)
	}
	defer rows.Close()
	out := make([]*TradeRow, 0, 16)
	for rows.Next() {
		t := &TradeRow{}
		if err := scanTrade(rows, t); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list trades: %w", err)
	}
	return out, nil
}

const tradeSelectSQL = `
SELECT t.id, t.initiator_id,
       COALESCE(NULLIF(TRIM(CONCAT_WS(' ', iu.first_name, iu.last_name)), ''), NULLIF(iu.username, ''), 'Unknown'),
       t.counterparty_id,
       t.initiator_item_id, si.name, COALESCE(si.icon_ref, ''),
       t.counterparty_item_id, sc.name, COALESCE(sc.icon_ref, ''),
       t.note, t.status, t.proposed_at, t.decided_at
FROM user_trades t
JOIN users iu ON iu.id = t.initiator_id
JOIN shop_items si ON si.id = t.initiator_item_id
JOIN shop_items sc ON sc.id = t.counterparty_item_id
`

func scanTrade(row rowScanner, t *TradeRow) error {
	if err := row.Scan(
		&t.ID, &t.InitiatorID, &t.InitiatorName,
		&t.CounterpartyID,
		&t.InitiatorItemID, &t.InitiatorItemName, &t.InitiatorItemIcon,
		&t.CounterpartyItemID, &t.CounterpartyItemName, &t.CounterpartyItemIcon,
		&t.Note, &t.Status, &t.ProposedAt, &t.DecidedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrTradeNotFound
		}
		return fmt.Errorf("scan trade: %w", err)
	}
	return nil
}
