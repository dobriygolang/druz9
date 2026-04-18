package hub

import (
	"context"

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

	return resp, nil
}
