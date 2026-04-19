package main

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	inboxservice "api/internal/api/inbox"
	inboxdata "api/internal/data/inbox"
)

// inboxGiftsAdapter bridges data/inbox.Repo to the API-side GiftsRepo
// contract. Translates the data-layer sentinels into the API-layer ones
// so handlers stay free of pgx imports.
type inboxGiftsAdapter struct {
	repo *inboxdata.Repo
}

func (a inboxGiftsAdapter) SendGift(ctx context.Context, senderID, recipientID, itemID uuid.UUID, note string) (*inboxservice.GiftRowAPI, error) {
	row, err := a.repo.SendGift(ctx, senderID, recipientID, itemID, note)
	return mapGift(row), translateGiftErr(err)
}

func (a inboxGiftsAdapter) ListGifts(ctx context.Context, side string, userID uuid.UUID, status string) ([]*inboxservice.GiftRowAPI, error) {
	rows, err := a.repo.ListGifts(ctx, side, userID, status)
	if err != nil {
		return nil, fmt.Errorf("list gifts: %w", translateGiftErr(err))
	}
	out := make([]*inboxservice.GiftRowAPI, len(rows))
	for i, r := range rows {
		out[i] = mapGift(r)
	}
	return out, nil
}

func (a inboxGiftsAdapter) ClaimGift(ctx context.Context, recipientID, giftID uuid.UUID) (*inboxservice.GiftRowAPI, error) {
	row, err := a.repo.ClaimGift(ctx, recipientID, giftID)
	return mapGift(row), translateGiftErr(err)
}

func (a inboxGiftsAdapter) DeclineGift(ctx context.Context, recipientID, giftID uuid.UUID) (*inboxservice.GiftRowAPI, error) {
	row, err := a.repo.DeclineGift(ctx, recipientID, giftID)
	return mapGift(row), translateGiftErr(err)
}

func mapGift(g *inboxdata.GiftRow) *inboxservice.GiftRowAPI {
	if g == nil {
		return nil
	}
	return &inboxservice.GiftRowAPI{
		ID:          g.ID.String(),
		SenderID:    g.SenderID.String(),
		SenderName:  g.SenderName,
		RecipientID: g.RecipientID.String(),
		ItemID:      g.ItemID.String(),
		ItemName:    g.ItemName,
		ItemIconRef: g.ItemIconRef,
		Note:        g.Note,
		Status:      g.Status,
		SentAt:      g.SentAt,
		DecidedAt:   g.DecidedAt,
	}
}

// inboxTradesAdapter satisfies inboxservice.TradesRepo. Mirror of the
// gifts adapter for the bidirectional swap flow (#5).
type inboxTradesAdapter struct {
	repo *inboxdata.Repo
}

func (a inboxTradesAdapter) ProposeTrade(ctx context.Context, initiatorID, counterpartyID, initiatorItemID, counterpartyItemID uuid.UUID, note string) (*inboxservice.TradeRowAPI, error) {
	row, err := a.repo.ProposeTrade(ctx, initiatorID, counterpartyID, initiatorItemID, counterpartyItemID, note)
	return mapTrade(row), translateTradeErr(err)
}

func (a inboxTradesAdapter) ListTrades(ctx context.Context, side string, userID uuid.UUID, status string) ([]*inboxservice.TradeRowAPI, error) {
	rows, err := a.repo.ListTrades(ctx, side, userID, status)
	if err != nil {
		return nil, fmt.Errorf("list trades: %w", translateTradeErr(err))
	}
	out := make([]*inboxservice.TradeRowAPI, len(rows))
	for i, r := range rows {
		out[i] = mapTrade(r)
	}
	return out, nil
}

func (a inboxTradesAdapter) AcceptTrade(ctx context.Context, counterpartyID, tradeID uuid.UUID) (*inboxservice.TradeRowAPI, error) {
	row, err := a.repo.AcceptTrade(ctx, counterpartyID, tradeID)
	return mapTrade(row), translateTradeErr(err)
}

func (a inboxTradesAdapter) CancelTrade(ctx context.Context, actorID, tradeID uuid.UUID) (*inboxservice.TradeRowAPI, error) {
	row, err := a.repo.CancelTrade(ctx, actorID, tradeID)
	return mapTrade(row), translateTradeErr(err)
}

func mapTrade(t *inboxdata.TradeRow) *inboxservice.TradeRowAPI {
	if t == nil {
		return nil
	}
	return &inboxservice.TradeRowAPI{
		ID:                   t.ID.String(),
		InitiatorID:          t.InitiatorID.String(),
		InitiatorName:        t.InitiatorName,
		CounterpartyID:       t.CounterpartyID.String(),
		InitiatorItemID:      t.InitiatorItemID.String(),
		InitiatorItemName:    t.InitiatorItemName,
		InitiatorItemIcon:    t.InitiatorItemIcon,
		CounterpartyItemID:   t.CounterpartyItemID.String(),
		CounterpartyItemName: t.CounterpartyItemName,
		CounterpartyItemIcon: t.CounterpartyItemIcon,
		Note:                 t.Note,
		Status:               t.Status,
		ProposedAt:           t.ProposedAt,
		DecidedAt:            t.DecidedAt,
	}
}

func translateTradeErr(err error) error {
	if err == nil {
		return nil
	}
	switch {
	case errors.Is(err, inboxdata.ErrTradeNotFound):
		return inboxservice.ErrTradeNotFound
	case errors.Is(err, inboxdata.ErrTradeNotPending):
		return inboxservice.ErrTradeNotPending
	case errors.Is(err, inboxdata.ErrTradeItemNotOwned):
		return inboxservice.ErrTradeItemNotOwned
	case errors.Is(err, inboxdata.ErrTradeItemEquipped):
		return inboxservice.ErrTradeItemEquipped
	}
	return err
}

func translateGiftErr(err error) error {
	if err == nil {
		return nil
	}
	switch {
	case errors.Is(err, inboxdata.ErrGiftItemNotOwned):
		return inboxservice.ErrGiftItemNotOwned
	case errors.Is(err, inboxdata.ErrGiftNotFound):
		return inboxservice.ErrGiftNotFound
	case errors.Is(err, inboxdata.ErrGiftNotPending):
		return inboxservice.ErrGiftNotPending
	}
	return err
}
