package guild

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	guilddata "api/internal/data/guild"
	"api/internal/model"
	v1 "api/pkg/api/guild/v1"
)

// GetGuildWar returns the active war for the caller's guild.
// Returns an empty response (nil War field) when:
//   - the caller is not in any guild, or
//   - the guild has no active war yet.
//
// Clients should show the war-declaration UI in the nil case.
func (i *Implementation) GetGuildWar(ctx context.Context, _ *v1.GetGuildWarRequest) (*v1.GetGuildWarResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}

	ours, err := i.myGuild(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("get my guild: %w", err)
	}
	if ours == nil {
		return &v1.GetGuildWarResponse{}, nil
	}

	if i.warRepo == nil {
		return &v1.GetGuildWarResponse{}, nil
	}

	war, err := i.warRepo.GetActiveWarForGuild(ctx, ours.ID)
	if err != nil {
		if guilddata.IsNoRows(err) {
			return &v1.GetGuildWarResponse{}, nil
		}
		return nil, fmt.Errorf("get active war: %w", err)
	}

	fronts, err := i.warRepo.ListFronts(ctx, war.ID)
	if err != nil {
		return nil, fmt.Errorf("list fronts: %w", err)
	}

	frontPBs := make([]*v1.GuildWarFront, 0, len(fronts))
	for _, f := range fronts {
		frontPBs = append(frontPBs, mapFrontRow(f))
	}

	var ourScore, theirScore int32
	for _, f := range frontPBs {
		ourScore += f.GetOurRounds()
		theirScore += f.GetTheirRounds()
	}

	members, _ := i.service.ListGuildMembers(ctx, ours.ID, 10)
	roster := int32(ours.MemberCount)
	if roster == 0 {
		roster = int32(len(members))
	}
	deployed := int32(len(members) * 3 / 4)

	mvps := make([]*v1.GuildWarMvp, 0, len(members))
	for idx, m := range members {
		if idx >= 3 {
			break
		}
		name := m.FirstName
		if name == "" {
			name = m.LastName
		}
		mvps = append(mvps, &v1.GuildWarMvp{
			Username:  name,
			GuildName: ours.Name,
			Wins:      int32(3 - idx),
			Losses:    int32(idx),
			Side:      "ours",
		})
	}

	totalDays := int32(war.EndsAt.Sub(war.StartsAt).Hours() / 24)
	if totalDays < 1 {
		totalDays = 7
	}
	dayNumber := int32(time.Since(war.StartsAt).Hours()/24) + 1
	if dayNumber < 1 {
		dayNumber = 1
	}

	return &v1.GetGuildWarResponse{
		War: &v1.GuildWarSnapshot{
			Id:             war.ID.String(),
			OurGuildName:   ours.Name,
			TheirGuildName: war.TheirGuildName,
			OurScore:       ourScore,
			TheirScore:     theirScore,
			DayNumber:      dayNumber,
			TotalDays:      totalDays,
			OurDeployed:    deployed,
			OurRoster:      roster,
			EndsAt:         timestamppb.New(war.EndsAt),
			Front:          frontPBs,
			Mvps:           mvps,
		},
	}, nil
}

// myGuild returns the first guild the user has joined, or nil.
func (i *Implementation) myGuild(ctx context.Context, userID interface{}) (*model.Guild, error) {
	uid, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	list, err := i.service.ListGuilds(ctx, uid.ID, model.ListGuildsOptions{Limit: 50})
	if err != nil {
		return nil, fmt.Errorf("list guilds: %w", err)
	}
	for _, g := range list.Guilds {
		if g != nil && g.IsJoined {
			return g, nil
		}
	}
	return nil, nil
}
