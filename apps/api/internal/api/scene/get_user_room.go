package scene

import (
	"context"
	"errors"
	"fmt"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/apihelpers"
	scenedata "api/internal/data/scene"
	v1 "api/pkg/api/scene/v1"
)

func (i *Implementation) GetUserRoom(ctx context.Context, req *v1.GetUserRoomRequest) (*v1.SceneLayoutResponse, error) {
	caller, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	ownerID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_USER_ID", "invalid user_id")
	}
	canEdit := caller.ID == ownerID

	layout, err := i.scenes.Get(ctx, scenedata.ScopeUserRoom, ownerID)
	if err != nil {
		if errors.Is(err, scenedata.ErrLayoutNotFound) {
			return emptyLayoutResponse(scenedata.ScopeUserRoom, ownerID, canEdit), nil
		}
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to load room")
	}
	return mapLayoutToProto(layout, canEdit), nil
}
