// #5 — Gift handlers. Replace text-DM UX with item exchanges. Adapter
// in cmd/api/inbox_gifts_adapter.go bridges to data/inbox.Repo.
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

// GiftsRepo is the slice of data/inbox.Repo this handler set consumes.
type GiftsRepo interface {
	SendGift(ctx context.Context, senderID, recipientID, itemID uuid.UUID, note string) (*GiftRowAPI, error)
	ListGifts(ctx context.Context, side string, userID uuid.UUID, status string) ([]*GiftRowAPI, error)
	ClaimGift(ctx context.Context, recipientID, giftID uuid.UUID) (*GiftRowAPI, error)
	DeclineGift(ctx context.Context, recipientID, giftID uuid.UUID) (*GiftRowAPI, error)
}

// GiftRowAPI mirrors data/inbox.GiftRow on the API boundary.
type GiftRowAPI struct {
	ID          string
	SenderID    string
	SenderName  string
	RecipientID string
	ItemID      string
	ItemName    string
	ItemIconRef string
	Note        string
	Status      string
	SentAt      time.Time
	DecidedAt   *time.Time
}

// API-level sentinels mirroring the data-layer ones.
var (
	ErrGiftItemNotOwned = errors.New("gift item not owned")
	ErrGiftNotFound     = errors.New("gift not found")
	ErrGiftNotPending   = errors.New("gift not pending")
)

// WithGiftsRepo wires gift persistence (#5). Optional.
func (i *Implementation) WithGiftsRepo(r GiftsRepo) *Implementation {
	i.gifts = r
	return i
}

func (i *Implementation) SendGift(ctx context.Context, req *v1.SendGiftRequest) (*v1.Gift, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.gifts == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "gifts repo missing")
	}
	recipient, err := uuid.Parse(req.GetRecipientId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_RECIPIENT", "invalid recipient_id")
	}
	if recipient == user.ID {
		return nil, kratoserrors.BadRequest("CANNOT_GIFT_SELF", "you cannot gift yourself")
	}
	itemID, err := uuid.Parse(req.GetItemId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_ITEM_ID", "invalid item_id")
	}
	row, err := i.gifts.SendGift(ctx, user.ID, recipient, itemID, req.GetNote())
	if err != nil {
		if errors.Is(err, ErrGiftItemNotOwned) {
			return nil, kratoserrors.BadRequest("ITEM_NOT_OWNED", "you don't own that item")
		}
		return nil, kratoserrors.InternalServer("INTERNAL", err.Error())
	}
	return giftToProto(row), nil
}

func (i *Implementation) ListReceivedGifts(ctx context.Context, req *v1.ListReceivedGiftsRequest) (*v1.ListGiftsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.gifts == nil {
		return &v1.ListGiftsResponse{}, nil
	}
	rows, err := i.gifts.ListGifts(ctx, "received", user.ID, req.GetStatus())
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to list gifts")
	}
	return &v1.ListGiftsResponse{Gifts: giftsToProto(rows)}, nil
}

func (i *Implementation) ListSentGifts(ctx context.Context, req *v1.ListSentGiftsRequest) (*v1.ListGiftsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.gifts == nil {
		return &v1.ListGiftsResponse{}, nil
	}
	rows, err := i.gifts.ListGifts(ctx, "sent", user.ID, req.GetStatus())
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to list gifts")
	}
	return &v1.ListGiftsResponse{Gifts: giftsToProto(rows)}, nil
}

func (i *Implementation) ClaimGift(ctx context.Context, req *v1.ClaimGiftRequest) (*v1.Gift, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.gifts == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "gifts repo missing")
	}
	id, err := uuid.Parse(req.GetGiftId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_GIFT_ID", "invalid gift_id")
	}
	row, err := i.gifts.ClaimGift(ctx, user.ID, id)
	if err != nil {
		if errors.Is(err, ErrGiftNotFound) {
			return nil, kratoserrors.NotFound("GIFT_NOT_FOUND", "gift not found")
		}
		if errors.Is(err, ErrGiftNotPending) {
			return nil, kratoserrors.BadRequest("GIFT_NOT_PENDING", "gift already decided")
		}
		return nil, kratoserrors.InternalServer("INTERNAL", err.Error())
	}
	return giftToProto(row), nil
}

func (i *Implementation) DeclineGift(ctx context.Context, req *v1.DeclineGiftRequest) (*v1.Gift, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.gifts == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "gifts repo missing")
	}
	id, err := uuid.Parse(req.GetGiftId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_GIFT_ID", "invalid gift_id")
	}
	row, err := i.gifts.DeclineGift(ctx, user.ID, id)
	if err != nil {
		if errors.Is(err, ErrGiftNotFound) {
			return nil, kratoserrors.NotFound("GIFT_NOT_FOUND", "gift not found")
		}
		if errors.Is(err, ErrGiftNotPending) {
			return nil, kratoserrors.BadRequest("GIFT_NOT_PENDING", "gift already decided")
		}
		return nil, kratoserrors.InternalServer("INTERNAL", err.Error())
	}
	return giftToProto(row), nil
}

func giftsToProto(rows []*GiftRowAPI) []*v1.Gift {
	out := make([]*v1.Gift, len(rows))
	for i, r := range rows {
		out[i] = giftToProto(r)
	}
	return out
}

func giftToProto(g *GiftRowAPI) *v1.Gift {
	if g == nil {
		return nil
	}
	out := &v1.Gift{
		Id:          g.ID,
		SenderId:    g.SenderID,
		SenderName:  g.SenderName,
		RecipientId: g.RecipientID,
		ItemId:      g.ItemID,
		ItemName:    g.ItemName,
		ItemIconRef: g.ItemIconRef,
		Note:        g.Note,
		Status:      g.Status,
		SentAt:      timestamppb.New(g.SentAt),
	}
	if g.DecidedAt != nil {
		out.DecidedAt = timestamppb.New(*g.DecidedAt)
	}
	return out
}
