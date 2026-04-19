package main

import (
	"context"
	"errors"

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
		return nil, err
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
