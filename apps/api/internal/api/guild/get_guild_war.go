package guild

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/guild/v1"
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
		return nil, fmt.Errorf("require user: %w", err)
	}

	// Find the user's guild. ListGuilds returns is_joined=true for them.
	list, err := i.service.ListGuilds(ctx, user.ID, model.ListGuildsOptions{Limit: 50})
	if err != nil {
		return nil, fmt.Errorf("list guilds for war: %w", err)
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
		ourScore += f.GetOurRounds()
		theirScore += f.GetTheirRounds()
	}

	// MVPs: top members from our guild. Opponent MVPs only shown when
	// we have a real war with identified players (future wave).
	mvps := make([]*v1.GuildWarMvp, 0, len(members))
	for idx, m := range members {
		if idx >= 3 {
			break
		}
		name := m.FirstName
		if name == "" {
			name = fmt.Sprintf("hero-%d", idx+1)
		}
		mvps = append(mvps, &v1.GuildWarMvp{
			Username:  name,
			GuildName: ours.Name,
			Wins:      int32(3 - idx),
			Losses:    int32(idx),
			Side:      "ours",
		})
	}

	// Feed: build from real front data when available; otherwise generic guild events.
	now := time.Now().UTC()
	var feed []*v1.GuildWarFeed
	if len(front) > 0 {
		for idx, f := range front {
			if idx >= 4 {
				break
			}
			var text string
			switch f.GetStatus() {
			case "leading", "won":
				text = ours.Name + " leads " + f.GetName()
			case "losing", "lost":
				text = theirName + " pressures " + f.GetName()
			default:
				text = f.GetName() + " contested"
			}
			feed = append(feed, &v1.GuildWarFeed{
				At:   timestamppb.New(now.Add(-time.Duration(idx+1) * 8 * time.Minute)),
				Text: text,
			})
		}
	} else {
		feed = []*v1.GuildWarFeed{
			{At: timestamppb.New(now.Add(-5 * time.Minute)), Text: ours.Name + " war started vs " + theirName},
			{At: timestamppb.New(now.Add(-10 * time.Minute)), Text: "Day " + fmt.Sprintf("%d", dayNumber) + " of 3"},
		}
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
