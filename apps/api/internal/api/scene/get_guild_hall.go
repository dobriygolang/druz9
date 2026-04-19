package scene

import (
	"context"
	"errors"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	guildapi "api/internal/api/guild"
	"api/internal/apihelpers"
	scenedata "api/internal/data/scene"
	v1 "api/pkg/api/scene/v1"
)

func (i *Implementation) GetGuildHall(ctx context.Context, req *v1.GetGuildHallRequest) (*v1.SceneLayoutResponse, error) {
	caller, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	guildID, err := uuid.Parse(req.GetGuildId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_GUILD_ID", "invalid guild_id")
	}

	canEdit := false
	if i.guilds != nil {
		role, _ := i.guilds.GetMemberRole(ctx, caller.ID, guildID)
		canEdit = guildapi.Can(guildapi.Role(role), guildapi.ActionEditGuildHall)
	}

	layout, err := i.scenes.Get(ctx, scenedata.ScopeGuildHall, guildID)
	if err != nil {
		if errors.Is(err, scenedata.ErrLayoutNotFound) {
			return emptyLayoutResponse(scenedata.ScopeGuildHall, guildID, canEdit), nil
		}
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to load guild hall")
	}
	return mapLayoutToProto(layout, canEdit), nil
}
