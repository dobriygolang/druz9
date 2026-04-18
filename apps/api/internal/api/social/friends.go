package social

import (
	"context"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/apihelpers"
	socialdomain "api/internal/domain/social"
	v1 "api/pkg/api/social/v1"
)

func (i *Implementation) ListFriends(ctx context.Context, req *v1.ListFriendsRequest) (*v1.ListFriendsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	result, err := i.service.ListFriends(ctx, user.ID, req.GetLimit(), req.GetOffset())
	if err != nil {
		klog.Errorf("social: list friends user=%s: %v", user.ID, err)
		return nil, errors.InternalServer("INTERNAL", "failed to list friends")
	}
	out := make([]*v1.Friend, 0, len(result.Friends))
	for _, f := range result.Friends {
		out = append(out, mapFriend(f))
	}
	return &v1.ListFriendsResponse{Friends: out, Total: result.Total, OnlineCount: result.OnlineCount}, nil
}

func (i *Implementation) RemoveFriend(ctx context.Context, req *v1.RemoveFriendRequest) (*v1.RemoveFriendResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	other, perr := apihelpers.ParseUUID(req.GetUserId(), "INVALID_USER_ID", "user_id")
	if perr != nil {
		return nil, perr
	}
	if err := i.service.RemoveFriend(ctx, user.ID, other); err != nil {
		if goerr.Is(err, socialdomain.ErrNotFriends) {
			return nil, errors.NotFound("NOT_FRIENDS", "no friendship to remove")
		}
		klog.Errorf("social: remove friend user=%s other=%s: %v", user.ID, other, err)
		return nil, errors.InternalServer("INTERNAL", "failed to remove friend")
	}
	return &v1.RemoveFriendResponse{Ok: true}, nil
}
