package hub

import (
	"context"
	"fmt"
	"math"
	"time"

	"api/internal/apihelpers"
	v1 "api/pkg/api/hub/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) GetOverview(ctx context.Context, req *v1.GetOverviewRequest) (*v1.GetOverviewResponse, error) {
	_ = req

	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	fullUser, err := i.service.profiles.FindUserByID(ctx, user.ID)
	if err != nil || fullUser == nil {
		return nil, errors.InternalServer("INTERNAL", "failed to load profile")
	}

	resp := &v1.GetOverviewResponse{
		Player:        i.buildPlayer(fullUser, nil),
		DailyMissions: []*v1.HubDailyMission{},
		Arena:         &v1.HubArena{Items: []*v1.HubArenaItem{}},
		Events:        []*v1.HubEvent{},
		MerchantPicks: []*v1.HubMerchantPick{},
	}

	progress, err := i.service.profiles.GetProfileProgress(ctx, user.ID)
	if err == nil && progress != nil {
		resp.Player = i.buildPlayer(fullUser, progress)
	}

	missions, err := i.service.missions.GetDailyMissions(ctx, user.ID)
	if err == nil && missions != nil {
		resp.DailyMissions = i.mapDailyMissions(missions)
	}

	resp.Quest = i.buildQuest(progress, resp.DailyMissions)
	resp.Arena.Items = i.loadArenaItems(ctx)
	resp.Events = i.loadEvents(ctx, user.ID)
	resp.Guild = i.loadGuild(ctx, user.ID)
	resp.ActiveSeason = i.loadActiveSeason(ctx)

	return resp, nil
}

func (i *Implementation) loadActiveSeason(ctx context.Context) *v1.HubSeason {
	if i.service.seasons == nil {
		return nil
	}
	pass, err := i.service.seasons.GetActivePass(ctx, time.Now().UTC())
	if err != nil || pass == nil {
		return nil
	}
	daysLeft := int32(math.Ceil(time.Until(pass.EndsAt).Hours() / 24.0))
	if daysLeft < 0 {
		daysLeft = 0
	}
	return &v1.HubSeason{
		Number:         pass.SeasonNumber,
		Title:          pass.Title,
		Roman:          toRoman(pass.SeasonNumber),
		DaysLeftLabel:  fmt.Sprintf("%d days left", daysLeft),
	}
}

// toRoman handles small positive integers. Season numbers are always
// small so a lookup-style reducer keeps it simple.
func toRoman(n int32) string {
	if n <= 0 {
		return ""
	}
	vals := []struct {
		v int32
		s string
	}{
		{1000, "M"}, {900, "CM"}, {500, "D"}, {400, "CD"},
		{100, "C"}, {90, "XC"}, {50, "L"}, {40, "XL"},
		{10, "X"}, {9, "IX"}, {5, "V"}, {4, "IV"}, {1, "I"},
	}
	out := ""
	for _, p := range vals {
		for n >= p.v {
			out += p.s
			n -= p.v
		}
	}
	return out
}
