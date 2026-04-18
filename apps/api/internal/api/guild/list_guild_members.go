package guild

import (
	"context"

	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	v1 "api/pkg/api/guild/v1"
)

func (i *Implementation) ListGuildMembers(ctx context.Context, req *v1.ListGuildMembersRequest) (*v1.ListGuildMembersResponse, error) {
	guildID, err := apihelpers.ParseUUID(req.GetGuildId(), "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, err
	}

	members, err := i.service.ListGuildMembers(ctx, guildID, 100)
	if err != nil {
		return nil, err
	}

	out := make([]*v1.GuildMember, 0, len(members))
	for _, m := range members {
		if m == nil {
			continue
		}
		out = append(out, &v1.GuildMember{
			UserId:    m.UserID.String(),
			FirstName: m.FirstName,
			LastName:  m.LastName,
			AvatarUrl: m.AvatarURL,
			Role:      mapGuildMemberRole(m.Role),
			JoinedAt:  timestamppb.New(m.JoinedAt),
		})
	}
	return &v1.ListGuildMembersResponse{Members: out}, nil
}
