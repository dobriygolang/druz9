// #5 — Trade handlers (bidirectional swap). Adapter in
// cmd/api/inbox_gifts_adapter.go bridges to data/inbox.Repo.
package inbox

import (
	"context"
	"errors"
	"fmt"
	"time"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	v1 "api/pkg/api/inbox/v1"
)

type TradesRepo interface {
	ProposeTrade(ctx context.Context, initiatorID, counterpartyID, initiatorItemID, counterpartyItemID uuid.UUID, note string) (*TradeRowAPI, error)
	ListTrades(ctx context.Context, side string, userID uuid.UUID, status string) ([]*TradeRowAPI, error)
	AcceptTrade(ctx context.Context, counterpartyID, tradeID uuid.UUID) (*TradeRowAPI, error)
	CancelTrade(ctx context.Context, actorID, tradeID uuid.UUID) (*TradeRowAPI, error)
}

// TradeRowAPI mirrors data/inbox.TradeRow on the API boundary.
type TradeRowAPI struct {
	ID                   string
	InitiatorID          string
	InitiatorName        string
	CounterpartyID       string
	InitiatorItemID      string
	InitiatorItemName    string
	InitiatorItemIcon    string
	CounterpartyItemID   string
	CounterpartyItemName string
	CounterpartyItemIcon string
	Note                 string
	Status               string
	ProposedAt           time.Time
	DecidedAt            *time.Time
}

var (
	ErrTradeNotFound     = errors.New("trade not found")
	ErrTradeNotPending   = errors.New("trade not pending")
	ErrTradeItemNotOwned = errors.New("trade item not owned by required side")
	ErrTradeItemEquipped = errors.New("trade item is currently equipped")
)

func (i *Implementation) WithTradesRepo(r TradesRepo) *Implementation {
	i.trades = r
	return i
}

func (i *Implementation) ProposeTrade(ctx context.Context, req *v1.ProposeTradeRequest) (*v1.Trade, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.trades == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "trades repo missing")
	}
	cp, err := uuid.Parse(req.GetCounterpartyId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_COUNTERPARTY", "invalid counterparty_id")
	}
	if cp == user.ID {
		return nil, kratoserrors.BadRequest("CANNOT_TRADE_SELF", "you cannot trade with yourself")
	}
	myItem, err := uuid.Parse(req.GetInitiatorItemId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_ITEM", "invalid initiator_item_id")
	}
	theirItem, err := uuid.Parse(req.GetCounterpartyItemId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_ITEM", "invalid counterparty_item_id")
	}
	row, err := i.trades.ProposeTrade(ctx, user.ID, cp, myItem, theirItem, req.GetNote())
	if err != nil {
		return nil, mapTradeErr(err)
	}
	return tradeToProto(row), nil
}

func (i *Implementation) ListReceivedTrades(ctx context.Context, req *v1.ListTradesRequest) (*v1.ListTradesResponse, error) {
	return i.listTrades(ctx, "received", req.GetStatus())
}

func (i *Implementation) ListSentTrades(ctx context.Context, req *v1.ListTradesRequest) (*v1.ListTradesResponse, error) {
	return i.listTrades(ctx, "sent", req.GetStatus())
}

func (i *Implementation) listTrades(ctx context.Context, side, status string) (*v1.ListTradesResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.trades == nil {
		return &v1.ListTradesResponse{}, nil
	}
	rows, err := i.trades.ListTrades(ctx, side, user.ID, status)
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to list trades")
	}
	out := make([]*v1.Trade, len(rows))
	for i, r := range rows {
		out[i] = tradeToProto(r)
	}
	return &v1.ListTradesResponse{Trades: out}, nil
}

func (i *Implementation) AcceptTrade(ctx context.Context, req *v1.AcceptTradeRequest) (*v1.Trade, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.trades == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "trades repo missing")
	}
	id, err := uuid.Parse(req.GetTradeId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_TRADE_ID", "invalid trade_id")
	}
	row, err := i.trades.AcceptTrade(ctx, user.ID, id)
	if err != nil {
		return nil, mapTradeErr(err)
	}
	return tradeToProto(row), nil
}

func (i *Implementation) CancelTrade(ctx context.Context, req *v1.CancelTradeRequest) (*v1.Trade, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.trades == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "trades repo missing")
	}
	id, err := uuid.Parse(req.GetTradeId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_TRADE_ID", "invalid trade_id")
	}
	row, err := i.trades.CancelTrade(ctx, user.ID, id)
	if err != nil {
		return nil, mapTradeErr(err)
	}
	return tradeToProto(row), nil
}

func mapTradeErr(err error) error {
	switch {
	case errors.Is(err, ErrTradeNotFound):
		return kratoserrors.NotFound("TRADE_NOT_FOUND", "trade not found")
	case errors.Is(err, ErrTradeNotPending):
		return kratoserrors.BadRequest("TRADE_NOT_PENDING", "trade already decided")
	case errors.Is(err, ErrTradeItemNotOwned):
		return kratoserrors.BadRequest("ITEM_NOT_OWNED", "one side no longer owns the proposed item")
	case errors.Is(err, ErrTradeItemEquipped):
		return kratoserrors.BadRequest("ITEM_EQUIPPED", "an item is currently equipped — unequip first")
	}
	return kratoserrors.InternalServer("INTERNAL", err.Error())
}

func tradeToProto(t *TradeRowAPI) *v1.Trade {
	if t == nil {
		return nil
	}
	out := &v1.Trade{
		Id:                   t.ID,
		InitiatorId:          t.InitiatorID,
		InitiatorName:        t.InitiatorName,
		CounterpartyId:       t.CounterpartyID,
		InitiatorItemId:      t.InitiatorItemID,
		InitiatorItemName:    t.InitiatorItemName,
		InitiatorItemIcon:    t.InitiatorItemIcon,
		CounterpartyItemId:   t.CounterpartyItemID,
		CounterpartyItemName: t.CounterpartyItemName,
		CounterpartyItemIcon: t.CounterpartyItemIcon,
		Note:                 t.Note,
		Status:               t.Status,
		ProposedAt:           timestamppb.New(t.ProposedAt),
	}
	if t.DecidedAt != nil {
		out.DecidedAt = timestamppb.New(*t.DecidedAt)
	}
	return out
}
