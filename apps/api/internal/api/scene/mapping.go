package scene

import (
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"

	scenedata "api/internal/data/scene"
	v1 "api/pkg/api/scene/v1"
)

func mapItemsToProto(items []scenedata.PlacedItem) []*v1.PlacedItem {
	out := make([]*v1.PlacedItem, len(items))
	for i, it := range items {
		out[i] = &v1.PlacedItem{
			ItemId:      it.ItemID.String(),
			X:           it.X,
			Y:           it.Y,
			Scale:       it.Scale,
			RotationDeg: it.RotationDeg,
			ZIndex:      it.ZIndex,
			Flipped:     it.Flipped,
		}
	}
	return out
}

// mapItemsFromProto returns the parsed items and the first parse error
// found (if any). Caller should respond with InvalidArgument on error.
func mapItemsFromProto(items []*v1.PlacedItem) ([]scenedata.PlacedItem, error) {
	out := make([]scenedata.PlacedItem, 0, len(items))
	for _, it := range items {
		id, err := uuid.Parse(it.GetItemId())
		if err != nil {
			return nil, err
		}
		scale := it.GetScale()
		if scale <= 0 {
			scale = 1.0
		}
		out = append(out, scenedata.PlacedItem{
			ItemID:      id,
			X:           it.GetX(),
			Y:           it.GetY(),
			Scale:       scale,
			RotationDeg: it.GetRotationDeg(),
			ZIndex:      it.GetZIndex(),
			Flipped:     it.GetFlipped(),
		})
	}
	return out, nil
}

func mapLayoutToProto(l *scenedata.Layout, canEdit bool) *v1.SceneLayoutResponse {
	if l == nil {
		return &v1.SceneLayoutResponse{CanEdit: canEdit}
	}
	return &v1.SceneLayoutResponse{
		Layout: &v1.SceneLayout{
			Id:            l.ID.String(),
			Scope:         string(l.Scope),
			OwnerId:       l.OwnerID.String(),
			Width:         l.Width,
			Height:        l.Height,
			BackgroundRef: l.BackgroundRef,
			Items:         mapItemsToProto(l.Items),
			UpdatedAt:     timestamppb.New(l.UpdatedAt),
		},
		CanEdit: canEdit,
	}
}

// emptyLayoutResponse is returned for first-visit pages where no layout
// exists yet. The frontend treats it as "blank canvas, click to edit".
func emptyLayoutResponse(scope scenedata.Scope, ownerID uuid.UUID, canEdit bool) *v1.SceneLayoutResponse {
	return &v1.SceneLayoutResponse{
		Layout: &v1.SceneLayout{
			Scope:   string(scope),
			OwnerId: ownerID.String(),
			Width:   defaultCanvasWidth,
			Height:  defaultCanvasHeight,
		},
		CanEdit: canEdit,
	}
}
