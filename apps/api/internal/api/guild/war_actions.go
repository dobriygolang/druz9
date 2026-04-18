package guild

import (
	"context"
	"fmt"
	goerr "errors"

	kerrs "github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	guilddata "api/internal/data/guild"
	"api/internal/model"
	v1 "api/pkg/api/guild/v1"
)

// Default set of 5 fronts seeded on war bootstrap. Admin UI can add /
// rename them later via direct SQL until the admin CRUD lands.
var defaultFrontNames = []string{
	"Graphs Bastion",
	"Systems Tower",
	"DP Canyon",
	"String Bridge",
	"Algo Plaza",
}

// ensureActiveWar returns an active war for the caller's guild,
// bootstrapping one if missing. Returns nil if the caller isn't in any
// guild.
func (i *Implementation) ensureActiveWar(ctx context.Context, userID any) (*guilddata.WarRow, *model.Guild, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, nil, err
	}
	_ = userID
	list, err := i.service.ListGuilds(ctx, user.ID, model.ListGuildsOptions{Limit: 50})
	if err != nil {
		return nil, nil, fmt.Errorf("list guilds: %w", err)
	}
	var ours *model.Guild
	for _, g := range list.Guilds {
		if g != nil && g.IsJoined {
			ours = g
			break
		}
	}
	if ours == nil {
		return nil, nil, nil
	}
	theirName := "Red Ravens"
	for _, g := range list.Guilds {
		if g == nil || g.ID == ours.ID {
			continue
		}
		theirName = g.Name
		break
	}
	if i.warRepo == nil {
		return nil, ours, nil
	}
	war, err := i.warRepo.GetActiveWarForGuild(ctx, ours.ID)
	if err == nil {
		return war, ours, nil
	}
	if !guilddata.IsNoRows(err) {
		return nil, ours, err
	}
	// No war yet — bootstrap one that lasts 7 days.
	war, _, err = i.warRepo.CreateWarWithFronts(ctx, ours.ID, theirName, defaultFrontNames, 7*24*60*60*1e9) // 7 days in ns
	if err != nil {
		return nil, ours, err
	}
	return war, ours, nil
}

// ContributeToFront is the core "play the war" RPC — a member adds
// rounds to a front their guild owns. Captures the front once it
// crosses the threshold and inserts a guild_territories row.
func (i *Implementation) ContributeToFront(ctx context.Context, req *v1.ContributeToFrontRequest) (*v1.ContributeToFrontResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	if i.warRepo == nil {
		return nil, kerrs.InternalServer("INTERNAL", "guild war storage unavailable")
	}
	frontID, err := apihelpers.ParseUUID(req.GetFrontId(), "INVALID_FRONT_ID", "front_id")
	if err != nil {
		return nil, err
	}
	war, ours, err := i.ensureActiveWar(ctx, user.ID)
	if err != nil {
		klog.Errorf("guild_war: ensure active war: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to load war")
	}
	if war == nil || ours == nil {
		return nil, kerrs.Conflict("NO_GUILD", "join a guild before contributing to the war")
	}
	fronts, err := i.warRepo.ListFronts(ctx, war.ID)
	if err != nil {
		return nil, fmt.Errorf("list fronts: %w", err)
	}
	var belongs bool
	for _, f := range fronts {
		if f.ID == frontID {
			belongs = true
			break
		}
	}
	if !belongs {
		return nil, kerrs.NotFound("FRONT_NOT_FOUND", "front not part of your active war")
	}
	updated, captured, err := i.warRepo.ContributeRounds(ctx, frontID, war.ID, user.ID, ours.ID, req.GetRounds())
	if err != nil {
		if goerr.Is(err, guilddata.ErrFrontAlreadyCaptured) {
			return nil, kerrs.Conflict("FRONT_CAPTURED", "front already captured")
		}
		klog.Errorf("guild_war: contribute front=%s: %v", frontID, err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to contribute")
	}
	return &v1.ContributeToFrontResponse{
		Front:    mapFrontRow(updated),
		Captured: captured,
	}, nil
}

func (i *Implementation) ListTerritories(ctx context.Context, req *v1.ListTerritoriesRequest) (*v1.ListTerritoriesResponse, error) {
	if _, err := apihelpers.RequireUser(ctx); err != nil {
		return nil, err
	}
	if i.warRepo == nil {
		return &v1.ListTerritoriesResponse{}, nil
	}
	guildID, err := apihelpers.ParseUUID(req.GetGuildId(), "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, err
	}
	rows, err := i.warRepo.ListTerritories(ctx, guildID)
	if err != nil {
		klog.Errorf("guild_war: list territories: %v", err)
		return nil, fmt.Errorf("list territories: %w", err)
	}
	out := make([]*v1.GuildTerritory, 0, len(rows))
	for _, t := range rows {
		out = append(out, &v1.GuildTerritory{
			Id:         t.ID.String(),
			GuildId:    t.GuildID.String(),
			Name:       t.Name,
			Buff:       t.Buff,
			CapturedAt: timestamppb.New(t.CapturedAt),
		})
	}
	return &v1.ListTerritoriesResponse{Territories: out}, nil
}

func mapFrontRow(f *guilddata.FrontRow) *v1.GuildWarFront {
	if f == nil {
		return nil
	}
	status := "contested"
	switch {
	case f.CapturedBy == "ours":
		status = "won"
	case f.CapturedBy == "theirs":
		status = "lost"
	case f.OurRounds > f.TheirRounds:
		status = "leading"
	case f.OurRounds < f.TheirRounds:
		status = "losing"
	}
	return &v1.GuildWarFront{
		Id:          f.ID.String(),
		Name:        f.Name,
		OurRounds:   f.OurRounds,
		TheirRounds: f.TheirRounds,
		Status:      status,
		IsHot:       status == "contested",
		IsDanger:    status == "losing",
	}
}
