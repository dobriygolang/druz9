package guild

import (
	"math"

	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/model"
	v1 "api/pkg/api/guild/v1"
)

func mapChallenge(ch *model.GuildChallenge) *v1.GuildChallengeData {
	if ch == nil {
		return nil
	}
	progress := make([]*v1.ChallengeMemberProgress, 0, len(ch.Progress))
	for _, p := range ch.Progress {
		progress = append(progress, &v1.ChallengeMemberProgress{
			UserId:    p.UserID.String(),
			FirstName: p.FirstName,
			LastName:  p.LastName,
			AvatarUrl: p.AvatarURL,
			Current:   p.Current,
		})
	}
	return &v1.GuildChallengeData{
		Id:          ch.ID.String(),
		GuildId:     ch.GuildID.String(),
		TemplateKey: ch.TemplateKey,
		TargetValue: ch.TargetValue,
		StartsAt:    timestamppb.New(ch.StartsAt),
		EndsAt:      timestamppb.New(ch.EndsAt),
		CreatedBy:   ch.CreatedBy.String(),
		Progress:    progress,
	}
}

func mapGuild(item *model.Guild) *v1.Guild {
	if item == nil {
		return nil
	}

	memberCount := uint32(0)
	if item.MemberCount > 0 {
		if item.MemberCount > math.MaxUint32 {
			memberCount = math.MaxUint32
		} else {
			memberCount = uint32(item.MemberCount)
		}
	}

	return &v1.Guild{
		Id:          item.ID.String(),
		Name:        item.Name,
		Description: item.Description,
		CreatorId:   item.CreatorID.String(),
		MemberCount: memberCount,
		Tags:        item.Tags,
		IsPublic:    item.IsPublic,
		IsJoined:    item.IsJoined,
		CreatedAt:   timestamppb.New(item.CreatedAt),
	}
}

func mapListGuildsResponse(resp *model.ListGuildsResponse) *v1.ListGuildsResponse {
	if resp == nil {
		return nil
	}

	guilds := make([]*v1.Guild, 0, len(resp.Guilds))
	for _, item := range resp.Guilds {
		if item == nil {
			continue
		}
		guilds = append(guilds, mapGuild(item))
	}

	return &v1.ListGuildsResponse{
		Guilds:     guilds,
		TotalCount: resp.TotalCount,
	}
}
