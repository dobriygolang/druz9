package main

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	walletdata "api/internal/data/wallet"
	walletdomain "api/internal/domain/wallet"
	"api/internal/model"
)

// adminWalletGranter satisfies admin.WalletGranter. Routes the credit
// through the data-layer ChangeBalance so the ledger row is written.
type adminWalletGranter struct {
	repo *walletdata.Repo
}

func (g adminWalletGranter) Grant(ctx context.Context, userID uuid.UUID, currency string, amount int64, reason string) error {
	if amount <= 0 {
		return fmt.Errorf("grant: amount must be positive")
	}
	if amount > int64(int32(amount)) || amount > 1_000_000_000 {
		return fmt.Errorf("grant: amount too large for ledger (int32 ceiling)")
	}
	cur, err := parseCurrency(currency)
	if err != nil {
		return err
	}
	_, err = g.repo.ChangeBalance(ctx, userID, cur, int32(amount), model.WalletTxKindAdmin, "", reason)
	return err
}

func parseCurrency(s string) (walletdomain.Currency, error) {
	switch s {
	case "gold":
		return walletdomain.CurrencyGold, nil
	case "gems":
		return walletdomain.CurrencyGems, nil
	case "shards":
		return walletdomain.CurrencyShards, nil
	}
	return walletdomain.CurrencyUnspecified, fmt.Errorf("unknown currency %q", s)
}
