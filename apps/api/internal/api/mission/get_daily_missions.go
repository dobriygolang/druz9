package mission

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/mission/v1"
)

func (i *Implementation) GetDailyMissions(ctx context.Context, _ *v1.GetDailyMissionsRequest) (*v1.GetDailyMissionsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	result, err := i.service.GetDailyMissions(ctx, user.ID)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to load daily missions")
	}

	return mapDailyMissionsResponse(result), nil
}

func mapDailyMissionsResponse(src *model.DailyMissionsResponse) *v1.GetDailyMissionsResponse {
	if src == nil {
		return &v1.GetDailyMissionsResponse{}
	}
	missions := make([]*v1.DailyMission, 0, len(src.Missions))
	for _, m := range src.Missions {
		if m == nil {
			continue
		}
		missions = append(missions, &v1.DailyMission{
			Key:         m.Key,
			Title:       m.Title,
			Description: m.Description,
			TargetValue: m.TargetValue,
			Current:     m.Current,
			Completed:   m.Completed,
			XpReward:    m.XPReward,
			ActionUrl:   m.ActionURL,
			Icon:        m.Icon,
		})
	}
	return &v1.GetDailyMissionsResponse{
		Missions:       missions,
		AllComplete:    src.AllComplete,
		CompletedCount: src.CompletedCount,
		BonusXp:        src.BonusXP,
		TotalXpEarned:  src.TotalXPEarned,
	}
}
