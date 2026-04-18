package guild

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/apihelpers"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) SetMemberRole(ctx context.Context, req *v1.SetMemberRoleRequest) (*v1.SetMemberRoleResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	guildID, err := uuid.Parse(req.GetGuildId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_GUILD_ID", "invalid guild_id")
	}
	targetID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user_id")
	}
	newRole := domainRole(req.GetRole())
	if newRole == "" {
		return nil, errors.BadRequest("INVALID_ROLE", "unknown role value")
	}
	if i.warRepo == nil {
		return nil, errors.InternalServer("NOT_CONFIGURED", "guild store not configured")
	}
	if err := i.warRepo.SetMemberRole(ctx, user.ID, guildID, targetID, newRole); err != nil {
		if err.Error() == "permission denied" {
			return nil, errors.Forbidden("FORBIDDEN", "only creators can set member roles")
		}
		return nil, errors.InternalServer("INTERNAL", "failed to set member role")
	}
	return &v1.SetMemberRoleResponse{Role: req.GetRole()}, nil
}

func domainRole(r v1.GuildMemberRole) string {
	switch r {
	case v1.GuildMemberRole_GUILD_MEMBER_ROLE_CREATOR:
		return "creator"
	case v1.GuildMemberRole_GUILD_MEMBER_ROLE_OFFICER:
		return "officer"
	case v1.GuildMemberRole_GUILD_MEMBER_ROLE_MEMBER:
		return "member"
	default:
		return ""
	}
}
