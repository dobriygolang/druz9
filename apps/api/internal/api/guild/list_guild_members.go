package guild

import (
	"context"

	v1 "api/pkg/api/guild/v1"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) ListGuildMembers(ctx context.Context, req *v1.ListGuildMembersRequest) (*v1.ListGuildMembersResponse, error) {
	guildID, err := uuid.Parse(req.GuildId)
	if err != nil {
		return nil, kratosErrors.BadRequest("INVALID_GUILD_ID", "invalid guild_id")
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
