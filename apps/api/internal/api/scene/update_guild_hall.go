package scene

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	guildapi "api/internal/api/guild"
	"api/internal/apihelpers"
	scenedata "api/internal/data/scene"
	v1 "api/pkg/api/scene/v1"
)

func (i *Implementation) UpdateGuildHall(ctx context.Context, req *v1.UpdateGuildHallRequest) (*v1.SceneLayoutResponse, error) {
	caller, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	guildID, err := uuid.Parse(req.GetGuildId())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_GUILD_ID", "invalid guild_id")
	}
	if i.guilds == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "guild role resolver missing")
	}
	role, err := i.guilds.GetMemberRole(ctx, caller.ID, guildID)
	if err != nil {
		return nil, kratoserrors.Forbidden("FORBIDDEN", "not a guild member")
	}
	if !guildapi.Can(guildapi.Role(role), guildapi.ActionEditGuildHall) {
		return nil, kratoserrors.Forbidden("FORBIDDEN", "only creator and officers can edit the hall")
	}

	width, height := normalizeCanvas(req.GetWidth(), req.GetHeight())

	items, err := mapItemsFromProto(req.GetItems())
	if err != nil {
		return nil, kratoserrors.BadRequest("INVALID_ITEM_ID", "invalid item id in payload")
	}
	if err := assertOwnership(ctx, items, func(ids []uuid.UUID) (map[uuid.UUID]bool, error) {
		return i.scenes.GuildOwnsItems(ctx, guildID, ids)
	}); err != nil {
		return nil, err
	}

	layout, err := i.scenes.Upsert(ctx, scenedata.ScopeGuildHall, guildID, caller.ID, width, height, req.GetBackgroundRef(), items)
	if err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to save guild hall")
	}
	return mapLayoutToProto(layout, true), nil
}
