package circle

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/circle/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) GetCirclePulse(ctx context.Context, req *v1.GetCirclePulseRequest) (*v1.GetCirclePulseResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	circleID, err := uuid.Parse(req.CircleId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_CIRCLE_ID", "invalid circle_id")
	}

	pulse, err := i.service.GetPulse(ctx, circleID, user.ID)
	if err != nil {
		return nil, err
	}

	weekActivity := make([]*v1.CircleDayActivity, 0, len(pulse.WeekActivity))
	for _, da := range pulse.WeekActivity {
		weekActivity = append(weekActivity, &v1.CircleDayActivity{
			Date:       da.Date,
			DailyCount: da.DailyCount,
			DuelCount:  da.DuelCount,
			MockCount:  da.MockCount,
		})
	}

	recentActions := make([]*v1.CircleMemberAction, 0, len(pulse.RecentActions))
	for _, a := range pulse.RecentActions {
		recentActions = append(recentActions, &v1.CircleMemberAction{
			UserId:       a.UserID.String(),
			FirstName:    a.FirstName,
			LastName:     a.LastName,
			AvatarUrl:    a.AvatarURL,
			ActionType:   a.ActionType,
			ActionDetail: a.ActionDetail,
			HappenedAt:   timestamppb.New(a.HappenedAt),
		})
	}

	return &v1.GetCirclePulseResponse{
		ActiveToday:   pulse.ActiveToday,
		TotalMembers:  pulse.TotalMembers,
		WeekActivity:  weekActivity,
		RecentActions: recentActions,
	}, nil
}
