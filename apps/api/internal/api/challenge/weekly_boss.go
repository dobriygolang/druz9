package challenge

import (
	"context"

	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	challengedomain "api/internal/domain/challenge"
	v1 "api/pkg/api/challenge/v1"
)

func (i *Implementation) GetWeeklyChallenge(ctx context.Context, _ *v1.GetWeeklyChallengeRequest) (*v1.GetWeeklyChallengeResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	weekKey := challengedomain.CurrentWeekKey()
	leaderboardRaw, _ := i.service.GetWeeklyLeaderboard(ctx, weekKey, 10)
	userEntry, _ := i.service.GetUserWeeklyEntry(ctx, user.ID, weekKey)
	weeklyTask, _ := i.service.GetWeeklyTask(ctx, weekKey)

	leaderboard := make([]*v1.WeeklyEntry, 0, len(leaderboardRaw))
	for _, e := range leaderboardRaw {
		entry := e
		leaderboard = append(leaderboard, mapWeeklyEntry(&entry))
	}

	return &v1.GetWeeklyChallengeResponse{
		WeekKey:     weekKey,
		EndsAt:      timestamppb.New(challengedomain.WeekEndsAt()),
		Leaderboard: leaderboard,
		MyEntry:     mapWeeklyEntry(userEntry),
		WeeklyTask:  mapWeeklyInfo(weeklyTask),
	}, nil
}
