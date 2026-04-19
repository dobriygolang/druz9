package guild

import (
	"context"
	goerr "errors"
	"fmt"

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

// getActiveWar looks up the caller's guild and its active war.
// Returns (nil, guild, nil) when the guild exists but has no active war.
// Returns (nil, nil, nil) when the caller is not in any guild.
// Never creates a war — use the declaration endpoints for that.
func (i *Implementation) getActiveWar(ctx context.Context) (*guilddata.WarRow, *model.Guild, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("require user: %w", err)
	}
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
	if ours == nil || i.warRepo == nil {
		return nil, ours, nil
	}
	war, err := i.warRepo.GetActiveWarForGuild(ctx, ours.ID)
	if err != nil {
		if guilddata.IsNoRows(err) {
			return nil, ours, nil
		}
		return nil, ours, fmt.Errorf("get active war: %w", err)
	}
	return war, ours, nil
}

// ensureActiveWar is kept as an alias of getActiveWar for backward compat
// with ContributeToFront and GetWarQuota (both require a war to exist).
func (i *Implementation) ensureActiveWar(ctx context.Context, _ any) (*guilddata.WarRow, *model.Guild, error) {
	return i.getActiveWar(ctx)
}

// ContributeToFront is the core "play the war" RPC — a member adds
// rounds to a front their guild owns. Captures the front once it
// crosses the threshold and inserts a guild_territories row.
func (i *Implementation) ContributeToFront(ctx context.Context, req *v1.ContributeToFrontRequest) (*v1.ContributeToFrontResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.warRepo == nil {
		return nil, kerrs.InternalServer("INTERNAL", "guild war storage unavailable")
	}
	frontID, err := apihelpers.ParseUUID(req.GetFrontId(), "INVALID_FRONT_ID", "front_id")
	if err != nil {
		return nil, fmt.Errorf("parse uuid: %w", err)
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
		if goerr.Is(err, guilddata.ErrDailyLimitExceeded) {
			return nil, kerrs.Forbidden("DAILY_LIMIT", "daily contribution limit reached")
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
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.warRepo == nil {
		return &v1.ListTerritoriesResponse{}, nil
	}
	guildID, err := apihelpers.ParseUUID(req.GetGuildId(), "INVALID_GUILD_ID", "guild_id")
	if err != nil {
		return nil, fmt.Errorf("parse guild id: %w", err)
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

// GetWarQuota returns how many war-front contributions the caller has made today and the daily limit.
func (i *Implementation) GetWarQuota(ctx context.Context, _ *v1.GetWarQuotaRequest) (*v1.GetWarQuotaResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, kerrs.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	if i.warRepo == nil {
		return &v1.GetWarQuotaResponse{Used: 0, Limit: int32(guilddata.DailyContributionLimit)}, nil
	}
	war, _, err := i.ensureActiveWar(ctx, user.ID)
	if err != nil || war == nil {
		return &v1.GetWarQuotaResponse{Used: 0, Limit: int32(guilddata.DailyContributionLimit)}, nil //nolint:nilerr // no active war is valid
	}
	count, err := i.warRepo.CountUserTodayContributions(ctx, user.ID, war.ID)
	if err != nil {
		klog.Errorf("guild_war: count today contributions user=%s: %v", user.ID, err)
		count = 0
	}
	return &v1.GetWarQuotaResponse{
		Used:  int32(count),
		Limit: int32(guilddata.DailyContributionLimit),
	}, nil
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
