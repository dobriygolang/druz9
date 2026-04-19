package scene

import (
	"context"
	"fmt"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/apihelpers"
	scenedata "api/internal/data/scene"
	v1 "api/pkg/api/scene/v1"
)

func (i *Implementation) UpdateUserRoom(ctx context.Context, req *v1.UpdateUserRoomRequest) (*v1.SceneLayoutResponse, error) {
	caller, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	ownerID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_USER_ID", "invalid user_id")
	}
	if caller.ID != ownerID {
		return nil, kratoserrors.Forbidden("FORBIDDEN", "cannot edit another user's room")
	}

	width, height := normalizeCanvas(req.GetWidth(), req.GetHeight())

	items, err := mapItemsFromProto(req.GetItems())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_ITEM_ID", "invalid item id in payload")
	}
	if err := assertOwnership(ctx, items, func(ids []uuid.UUID) (map[uuid.UUID]bool, error) {
		return i.scenes.UserOwnsItems(ctx, ownerID, ids)
	}); err != nil {
		return nil, err
	}

	layout, err := i.scenes.Upsert(ctx, scenedata.ScopeUserRoom, ownerID, caller.ID, width, height, req.GetBackgroundRef(), items)
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to save room")
	}
	return mapLayoutToProto(layout, true), nil
}

func normalizeCanvas(w, h int32) (int32, int32) {
	if w <= 0 {
		w = defaultCanvasWidth
	}
	if h <= 0 {
		h = defaultCanvasHeight
	}
	return w, h
}

// assertOwnership rejects the request if any placed item is not owned by
// the scope (user inventory or guild inventory). Keeps the same contract
// for both flows.
func assertOwnership(
	_ context.Context,
	items []scenedata.PlacedItem,
	check func(ids []uuid.UUID) (map[uuid.UUID]bool, error),
) error {
	if len(items) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, 0, len(items))
	seen := make(map[uuid.UUID]struct{}, len(items))
	for _, it := range items {
		if _, ok := seen[it.ItemID]; ok {
			continue
		}
		seen[it.ItemID] = struct{}{}
		ids = append(ids, it.ItemID)
	}
	owned, err := check(ids)
	if err != nil {
		return kratoserrors.InternalServer("INTERNAL", "failed to verify item ownership")
	}
	for _, id := range ids {
		if !owned[id] {
			return kratoserrors.Forbidden("ITEM_NOT_OWNED", "placed item not in inventory: "+id.String())
		}
	}
	return nil
}
