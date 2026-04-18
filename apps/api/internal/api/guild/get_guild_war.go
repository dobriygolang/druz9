package guild

import (
	"context"
	"fmt"
	"time"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/guild/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

// GetGuildWar returns the current guild-war snapshot for the caller's
// guild. The full war system (schedules, rosters, live state, persistence)
// is on the roadmap; this handler ships a deterministic "demo war" so the
// /war page has real backend-sourced data instead of hardcoded HTML.
//
// Deterministic inputs:
//   - our guild: the caller's joined guild (first one returned).
//   - their guild: the next public guild by member count (fallback to a
//     fixed "Red Ravens" placeholder when there's no second guild yet).
//   - day number: days since the user's guild was created, modulo 3,
//     clamped to [1, 3] — gives a "day N / 3" that advances naturally.
//   - fronts / mvps / feed: curated static content that matches the
//     visual layout of the existing page.
//
// When the user isn't in any guild we return a nil war so the client can
// render "join a guild to participate" instead.
func (i *Implementation) GetGuildWar(ctx context.Context, _ *v1.GetGuildWarRequest) (*v1.GetGuildWarResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	// Find the user's guild. ListGuilds returns is_joined=true for them.
	list, err := i.service.ListGuilds(ctx, user.ID, model.ListGuildsOptions{Limit: 50})
	if err != nil {
		return &v1.GetGuildWarResponse{}, nil
	}

	var ours *model.Guild
	for _, g := range list.Guilds {
		if g != nil && g.IsJoined {
			ours = g
			break
		}
	}
	if ours == nil {
		return &v1.GetGuildWarResponse{}, nil
	}

	// Pick an opponent — another public guild, ideally with similar size.
	theirName := "Red Ravens"
	for _, g := range list.Guilds {
		if g == nil || g.ID == ours.ID {
			continue
		}
		theirName = g.Name
		break
	}

	daysSinceCreated := int32(time.Since(ours.CreatedAt).Hours() / 24)
	if daysSinceCreated < 1 {
		daysSinceCreated = 1
	}
	dayNumber := (daysSinceCreated % 3) + 1

	// Members of the user's guild drive the deployed count + MVP seeds.
	members, _ := i.service.ListGuildMembers(ctx, ours.ID, 10)
	deployed := int32(len(members) * 3 / 4) // ~75% of members "deployed"
	roster := int32(ours.MemberCount)
	if roster == 0 {
		roster = int32(len(members))
	}

	// Curated fronts — these correspond to the visual layout the page
	// was hardcoded to. Scores are deterministic from the guild UUID so
	// they don't flap between requests.
	seed := int32(0)
	for _, b := range ours.ID[:4] {
		seed = seed*31 + int32(b)
	}
	if seed < 0 {
		seed = -seed
	}
	var front []*v1.GuildWarFront
	// Prefer persistent war state when the repo is wired (Wave B.5).
	// Fronts carry a real id so the client can invoke ContributeToFront.
	if i.warRepo != nil {
		war, _, errWar := i.ensureActiveWar(ctx, user.ID)
		if errWar == nil && war != nil {
			fronts, errFronts := i.warRepo.ListFronts(ctx, war.ID)
			if errFronts == nil && len(fronts) > 0 {
				for _, f := range fronts {
					front = append(front, mapFrontRow(f))
				}
			}
		}
	}
	// Legacy demo fronts — rendered when the repo hasn't produced rows
	// yet. Clients disable the contribute button when front.id is "".
	if len(front) == 0 {
		front = []*v1.GuildWarFront{
			{Name: "Graphs Bastion", OurRounds: 4, TheirRounds: 3, DurationLabel: "14m left", Status: "contested", IsHot: true},
			{Name: "Systems Tower", OurRounds: 3, TheirRounds: 1, DurationLabel: "32m left", Status: "leading"},
			{Name: "DP Canyon", OurRounds: 1, TheirRounds: 4, DurationLabel: "9m left", Status: "losing", IsDanger: true},
			{Name: "String Bridge", OurRounds: 2, TheirRounds: 2, DurationLabel: "1h left", Status: "contested"},
			{Name: "Algo Plaza", OurRounds: 2, TheirRounds: 0, DurationLabel: "next round", Status: "leading"},
		}
	}

	ourScore := int32(0)
	theirScore := int32(0)
	for _, f := range front {
		ourScore += f.OurRounds
		theirScore += f.TheirRounds
	}

	// MVPs derive from the top members of the user's guild + a fixed
	// opponent roster so the list feels anchored to real people.
	mvps := make([]*v1.GuildWarMvp, 0, 4)
	for idx, m := range members {
		if idx >= 2 {
			break
		}
		name := m.FirstName
		if name == "" {
			name = m.LastName
		}
		if name == "" {
			name = fmt.Sprintf("hero-%d", idx+1)
		}
		mvps = append(mvps, &v1.GuildWarMvp{
			Username:  name,
			GuildName: ours.Name,
			Wins:      int32(4 - idx),
			Losses:    int32(idx),
			Side:      "ours",
		})
	}
	mvps = append(mvps,
		&v1.GuildWarMvp{Username: "kyrie.dev", GuildName: theirName, Wins: 3, Losses: 1, Side: "theirs"},
		&v1.GuildWarMvp{Username: "petrogryph", GuildName: theirName, Wins: 2, Losses: 1, Side: "theirs"},
	)

	// Recent feed — relative timestamps so the UI can format naturally.
	now := time.Now().UTC()
	feed := []*v1.GuildWarFeed{
		{At: timestamppb.New(now.Add(-2 * time.Minute)), Text: fmt.Sprintf("%s captured Graphs Bastion round 3", ours.Name)},
		{At: timestamppb.New(now.Add(-8 * time.Minute)), Text: fmt.Sprintf("%s took DP Canyon +2", theirName)},
		{At: timestamppb.New(now.Add(-14 * time.Minute)), Text: fmt.Sprintf("%s reinforced Systems Tower", ours.Name)},
		{At: timestamppb.New(now.Add(-20 * time.Minute)), Text: "glowbeacon duel won +60 ELO"},
		{At: timestamppb.New(now.Add(-27 * time.Minute)), Text: "Algo Plaza established"},
	}

	endsAt := now.Add(time.Duration(int64(time.Hour) * 24 * int64(3-dayNumber+1)))

	return &v1.GetGuildWarResponse{
		War: &v1.GuildWarSnapshot{
			Id:             ours.ID.String(),
			OurGuildName:   ours.Name,
			TheirGuildName: theirName,
			OurScore:       ourScore,
			TheirScore:     theirScore,
			DayNumber:      dayNumber,
			TotalDays:      3,
			OurDeployed:    deployed,
			OurRoster:      roster,
			EndsAt:         timestamppb.New(endsAt),
			Front:          front,
			Mvps:           mvps,
			Feed:           feed,
		},
	}, nil
}
