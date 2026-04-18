package model

import (
	"time"

	"github.com/google/uuid"
)

// WalletBalance is the current gold/gems/shards for a user.
type WalletBalance struct {
	UserID    uuid.UUID `json:"userId"`
	Gold      int32     `json:"gold"`
	Gems      int32     `json:"gems"`
	Shards    int32     `json:"shards"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// WalletTxKind classifies a transaction's source for ledger auditing.
type WalletTxKind string

const (
	WalletTxKindShop         WalletTxKind = "shop"
	WalletTxKindArenaWin     WalletTxKind = "arena_win"
	WalletTxKindMission      WalletTxKind = "mission"
	WalletTxKindSeasonPass   WalletTxKind = "season_pass"
	WalletTxKindStreakShield WalletTxKind = "streak_shield"
	WalletTxKindAdmin        WalletTxKind = "admin"
)
