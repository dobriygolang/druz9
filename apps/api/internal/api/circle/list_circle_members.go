package circle

import (
	"context"

	v1 "api/pkg/api/circle/v1"

	kratosErrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func (i *Implementation) ListCircleMembers(ctx context.Context, req *v1.ListCircleMembersRequest) (*v1.ListCircleMembersResponse, error) {
	circleID, err := uuid.Parse(req.CircleId)
	if err != nil {
		return nil, kratosErrors.BadRequest("INVALID_CIRCLE_ID", "invalid circle_id")
	}

	members, err := i.service.ListCircleMembers(ctx, circleID, 100)
	if err != nil {
		return nil, err
	}

	out := make([]*v1.CircleMember, 0, len(members))
	for _, m := range members {
		if m == nil {
			continue
		}
		out = append(out, &v1.CircleMember{
			UserId:    m.UserID.String(),
			FirstName: m.FirstName,
			LastName:  m.LastName,
			AvatarUrl: m.AvatarURL,
			Role:      mapCircleMemberRole(m.Role),
			JoinedAt:  timestamppb.New(m.JoinedAt),
		})
	}
	return &v1.ListCircleMembersResponse{Members: out}, nil
}
