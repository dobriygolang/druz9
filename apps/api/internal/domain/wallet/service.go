// Package wallet is the first-class currency domain. It holds
// gold/gems/shards balances and emits an audit-log row for every debit or
// credit. Other domains (shop, streak, season_pass, mission rewards) call
// into it via narrow interfaces — no direct DB access from them.
package wallet

import (
	"context"
	"errors"
	"fmt"

	"api/internal/model"

	"github.com/google/uuid"
)

//go:generate mockery --case underscore --name Repository --with-expecter --output mocks

// Repository is the persistence boundary.
type Repository interface {
	// GetOrCreate loads the user's wallet, creating a zero-balance row on
	// first access.
	GetOrCreate(ctx context.Context, userID uuid.UUID) (*model.WalletBalance, error)
	// ChangeBalance atomically adjusts one currency field by `delta`
	// (signed). Rejects when a debit would take the balance below zero.
	// Logs a ledger row in the same transaction.
	ChangeBalance(ctx context.Context, userID uuid.UUID, currency Currency, delta int32, source model.WalletTxKind, sourceID, reason string) (*model.WalletBalance, error)
}

// Currency selects which balance column to touch. Matches the shop.proto
// enum values 1..3.
type Currency int32

const (
	CurrencyUnspecified Currency = 0
	CurrencyGold        Currency = 1
	CurrencyGems        Currency = 2
	CurrencyShards      Currency = 3
)

type Config struct {
	Repository Repository
}

type Service struct {
	repo Repository
}

func NewService(c Config) *Service { return &Service{repo: c.Repository} }

// Domain errors.
var (
	ErrInsufficientFunds = errors.New("wallet: insufficient funds")
	ErrInvalidAmount     = errors.New("wallet: amount must be positive")
	ErrInvalidCurrency   = errors.New("wallet: invalid currency")
)

// GetBalance returns the user's full wallet. Creates a zero-balance row
// for first-time callers so downstream callers never get ENOTFOUND.
func (s *Service) GetBalance(ctx context.Context, userID uuid.UUID) (*model.WalletBalance, error) {
	return s.repo.GetOrCreate(ctx, userID)
}

// Debit subtracts `amount` from the chosen currency. Fails with
// ErrInsufficientFunds when the balance would go negative.
func (s *Service) Debit(
	ctx context.Context, userID uuid.UUID,
	currency Currency, amount int32,
	source model.WalletTxKind, sourceID, reason string,
) (*model.WalletBalance, error) {
	if amount <= 0 {
		return nil, ErrInvalidAmount
	}
	if currency < CurrencyGold || currency > CurrencyShards {
		return nil, ErrInvalidCurrency
	}
	return s.repo.ChangeBalance(ctx, userID, currency, -amount, source, sourceID, reason)
}

// Credit adds `amount` to the chosen currency. Used by mission-reward,
// arena-win, and admin grant flows.
func (s *Service) Credit(
	ctx context.Context, userID uuid.UUID,
	currency Currency, amount int32,
	source model.WalletTxKind, sourceID, reason string,
) (*model.WalletBalance, error) {
	if amount <= 0 {
		return nil, ErrInvalidAmount
	}
	if currency < CurrencyGold || currency > CurrencyShards {
		return nil, ErrInvalidCurrency
	}
	return s.repo.ChangeBalance(ctx, userID, currency, amount, source, sourceID, reason)
}

// ---------- Narrow adapter interfaces for domain callers ----------

// ShopAdapter satisfies shop.Wallet without leaking the full Service type.
type ShopAdapter struct{ s *Service }

func NewShopAdapter(s *Service) *ShopAdapter { return &ShopAdapter{s: s} }

func (a *ShopAdapter) DebitGold(ctx context.Context, userID uuid.UUID, amount int32) error {
	_, err := a.s.Debit(ctx, userID, CurrencyGold, amount, model.WalletTxKindShop, "", "shop purchase")
	return mapFundsErr(err)
}
func (a *ShopAdapter) DebitGems(ctx context.Context, userID uuid.UUID, amount int32) error {
	_, err := a.s.Debit(ctx, userID, CurrencyGems, amount, model.WalletTxKindShop, "", "shop purchase")
	return mapFundsErr(err)
}
func (a *ShopAdapter) GetBalance(ctx context.Context, userID uuid.UUID) (int32, int32, error) {
	b, err := a.s.GetBalance(ctx, userID)
	if err != nil {
		return 0, 0, err
	}
	return b.Gold, b.Gems, nil
}

// SeasonPassAdapter satisfies season_pass.Wallet (DebitGems only).
type SeasonPassAdapter struct{ s *Service }

func NewSeasonPassAdapter(s *Service) *SeasonPassAdapter { return &SeasonPassAdapter{s: s} }

func (a *SeasonPassAdapter) DebitGems(ctx context.Context, userID uuid.UUID, amount int32) error {
	_, err := a.s.Debit(ctx, userID, CurrencyGems, amount, model.WalletTxKindSeasonPass, "", "premium purchase")
	return mapFundsErr(err)
}

// StreakAdapter satisfies streak.Wallet (DebitGold only).
type StreakAdapter struct{ s *Service }

func NewStreakAdapter(s *Service) *StreakAdapter { return &StreakAdapter{s: s} }

func (a *StreakAdapter) DebitGold(ctx context.Context, userID uuid.UUID, amount int32) error {
	_, err := a.s.Debit(ctx, userID, CurrencyGold, amount, model.WalletTxKindStreakShield, "", "shield purchase")
	return mapFundsErr(err)
}

// mapFundsErr translates the domain-specific ErrInsufficientFunds into
// the error type each caller domain already defines so wrapper code stays
// minimal.
func mapFundsErr(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, ErrInsufficientFunds) {
		return fmt.Errorf("insufficient funds: %w", err)
	}
	return err
}
