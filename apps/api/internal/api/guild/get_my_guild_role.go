package guild

import (
	"context"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/apihelpers"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) GetMyGuildRole(ctx context.Context, req *v1.GetMyGuildRoleRequest) (*v1.GetMyGuildRoleResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	guildID, err := uuid.Parse(req.GetGuildId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_GUILD_ID", "invalid guild_id")
	}
	if i.warRepo == nil {
		return nil, errors.InternalServer("NOT_CONFIGURED", "guild role store not configured")
	}
	role, err := i.warRepo.GetMemberRole(ctx, user.ID, guildID)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to get role")
	}
	return &v1.GetMyGuildRoleResponse{Role: protoRole(role)}, nil
}

func protoRole(role string) v1.GuildMemberRole {
	switch role {
	case "creator":
		return v1.GuildMemberRole_GUILD_MEMBER_ROLE_CREATOR
	case "officer":
		return v1.GuildMemberRole_GUILD_MEMBER_ROLE_OFFICER
	case "member":
		return v1.GuildMemberRole_GUILD_MEMBER_ROLE_MEMBER
	default:
		return v1.GuildMemberRole_GUILD_MEMBER_ROLE_UNSPECIFIED
	}
}
