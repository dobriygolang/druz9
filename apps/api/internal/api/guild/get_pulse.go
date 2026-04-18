package guild

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/guild/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) GetGuildPulse(ctx context.Context, req *v1.GetGuildPulseRequest) (*v1.GetGuildPulseResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	guildID, err := uuid.Parse(req.GuildId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_GUILD_ID", "invalid guild_id")
	}

	pulse, err := i.service.GetPulse(ctx, guildID, user.ID)
	if err != nil {
		return nil, err
	}

	weekActivity := make([]*v1.GuildDayActivity, 0, len(pulse.WeekActivity))
	for _, da := range pulse.WeekActivity {
		weekActivity = append(weekActivity, &v1.GuildDayActivity{
			Date:       da.Date,
			DailyCount: da.DailyCount,
			DuelCount:  da.DuelCount,
			MockCount:  da.MockCount,
		})
	}

	recentActions := make([]*v1.GuildMemberAction, 0, len(pulse.RecentActions))
	for _, a := range pulse.RecentActions {
		recentActions = append(recentActions, &v1.GuildMemberAction{
			UserId:       a.UserID.String(),
			FirstName:    a.FirstName,
			LastName:     a.LastName,
			AvatarUrl:    a.AvatarURL,
			ActionType:   mapGuildActionType(a.ActionType),
			ActionDetail: a.ActionDetail,
			HappenedAt:   timestamppb.New(a.HappenedAt),
		})
	}

	return &v1.GetGuildPulseResponse{
		ActiveToday:   pulse.ActiveToday,
		TotalMembers:  pulse.TotalMembers,
		WeekActivity:  weekActivity,
		RecentActions: recentActions,
	}, nil
}
