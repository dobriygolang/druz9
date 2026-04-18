package friend_challenge

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/friend_challenge/v1"
)

func (i *Implementation) ListIncoming(ctx context.Context, req *v1.ListIncomingRequest) (*v1.ListChallengesResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	result, err := i.service.ListIncoming(ctx, user.ID, req.GetLimit(), req.GetOffset())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list incoming challenges")
	}
	return mapList(result), nil
}

func (i *Implementation) ListSent(ctx context.Context, req *v1.ListSentRequest) (*v1.ListChallengesResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	result, err := i.service.ListSent(ctx, user.ID, req.GetLimit(), req.GetOffset())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list sent challenges")
	}
	return mapList(result), nil
}

func (i *Implementation) ListHistory(ctx context.Context, req *v1.ListHistoryRequest) (*v1.ListChallengesResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	result, err := i.service.ListHistory(ctx, user.ID, req.GetLimit(), req.GetOffset())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list challenge history")
	}
	return mapList(result), nil
}

func mapList(list *model.ChallengeList) *v1.ListChallengesResponse {
	out := make([]*v1.FriendChallenge, 0, len(list.Challenges))
	for _, ch := range list.Challenges {
		out = append(out, mapChallenge(ch))
	}
	return &v1.ListChallengesResponse{Challenges: out, Total: list.Total}
}
