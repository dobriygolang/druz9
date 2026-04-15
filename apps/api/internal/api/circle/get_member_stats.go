package circle

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/circle/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) GetCircleMemberStats(ctx context.Context, req *v1.GetCircleMemberStatsRequest) (*v1.GetCircleMemberStatsResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	circleID, err := uuid.Parse(req.CircleId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_CIRCLE_ID", "invalid circle_id")
	}

	stats, err := i.service.GetMemberStats(ctx, circleID, user.ID)
	if err != nil {
		return nil, err
	}

	out := make([]*v1.CircleMemberStatsEntry, 0, len(stats))
	for _, s := range stats {
		out = append(out, &v1.CircleMemberStatsEntry{
			UserId:      s.UserID.String(),
			FirstName:   s.FirstName,
			LastName:    s.LastName,
			AvatarUrl:   s.AvatarURL,
			Role:        s.Role,
			JoinedAt:    timestamppb.New(s.JoinedAt),
			DailySolved: s.DailySolved,
			DuelsWon:    s.DuelsWon,
			DuelsPlayed: s.DuelsPlayed,
			MocksDone:   s.MocksDone,
			ArenaRating: s.ArenaRating,
			ArenaLeague: s.ArenaLeague,
		})
	}

	return &v1.GetCircleMemberStatsResponse{Members: out}, nil
}
