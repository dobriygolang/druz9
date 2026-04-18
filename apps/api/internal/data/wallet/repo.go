package wallet

import (
	"context"
	"errors"
	"fmt"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	walletdomain "api/internal/domain/wallet"
	"api/internal/model"
	"api/internal/storage/postgres"
)

type Repo struct {
	data *postgres.Store
	log  *log.Helper
}

func NewRepo(store *postgres.Store, logger log.Logger) *Repo {
	return &Repo{data: store, log: log.NewHelper(logger)}
}

// GetOrCreate reads the wallet, creating a fresh zero-balance row on first
// access.
func (r *Repo) GetOrCreate(ctx context.Context, userID uuid.UUID) (*model.WalletBalance, error) {
	if _, err := r.data.DB.Exec(ctx, `
        INSERT INTO user_wallets (user_id) VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
    `, userID); err != nil {
		return nil, fmt.Errorf("ensure wallet: %w", err)
	}

	var b model.WalletBalance
	b.UserID = userID
	if err := r.data.DB.QueryRow(ctx, `
        SELECT gold, gems, shards, updated_at FROM user_wallets WHERE user_id = $1
    `, userID).Scan(&b.Gold, &b.Gems, &b.Shards, &b.UpdatedAt); err != nil {
		return nil, fmt.Errorf("load wallet: %w", err)
	}
	return &b, nil
}

// ChangeBalance runs the debit/credit + ledger insert in a single
// transaction. Uses a column-conditioned WHERE so the update fails atomically
// when a debit would take the balance below zero.
func (r *Repo) ChangeBalance(
	ctx context.Context, userID uuid.UUID,
	currency walletdomain.Currency, delta int32,
	source model.WalletTxKind, sourceID, reason string,
) (*model.WalletBalance, error) {
	if currency < walletdomain.CurrencyGold || currency > walletdomain.CurrencyShards {
		return nil, walletdomain.ErrInvalidCurrency
	}

	col := columnFor(currency)

	tx, err := r.data.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Ensure row exists before updating — keeps the code path identical
	// for first-time and repeat callers.
	if _, err := tx.Exec(ctx, `
        INSERT INTO user_wallets (user_id) VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
    `, userID); err != nil {
		return nil, fmt.Errorf("ensure wallet: %w", err)
	}

	// Atomic UPDATE with balance guard for debits.
	// fmt.Sprintf is safe — `col` is an allowlisted identifier from columnFor.
	// For debits (delta < 0), require `col + delta >= 0`. Returning zero rows
	// → insufficient funds.
	var balance int32
	query := fmt.Sprintf(`
        UPDATE user_wallets
        SET %[1]s = %[1]s + $2, updated_at = NOW()
        WHERE user_id = $1 AND %[1]s + $2 >= 0
        RETURNING %[1]s
    `, col)

	err = tx.QueryRow(ctx, query, userID, delta).Scan(&balance)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, walletdomain.ErrInsufficientFunds
		}
		return nil, fmt.Errorf("update balance: %w", err)
	}

	// Ledger row (signed amount — positive for credit, negative for debit).
	if _, err := tx.Exec(ctx, `
        INSERT INTO user_wallet_transactions (user_id, currency, amount, reason, source_kind, source_id)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, userID, int16(currency), delta, reason, string(source), nullIfEmpty(sourceID)); err != nil {
		return nil, fmt.Errorf("insert ledger: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	// Re-read the whole wallet so the caller sees all three balances.
	return r.GetOrCreate(ctx, userID)
}

// columnFor whitelists the column name used in the UPDATE statement; never
// derived from user input.
func columnFor(c walletdomain.Currency) string {
	switch c {
	case walletdomain.CurrencyUnspecified:
		return "gold"
	case walletdomain.CurrencyGold:
		return "gold"
	case walletdomain.CurrencyGems:
		return "gems"
	case walletdomain.CurrencyShards:
		return "shards"
	}
	return "gold" // unreachable due to validation upstream
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
