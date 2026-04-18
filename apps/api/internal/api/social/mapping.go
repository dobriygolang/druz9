package social

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/model"
	v1 "api/pkg/api/social/v1"
)

func mapFriend(f *model.Friend) *v1.Friend {
	if f == nil {
		return nil
	}
	return &v1.Friend{
		UserId:       f.UserID.String(),
		Username:     f.Username,
		DisplayName:  f.DisplayName,
		AvatarUrl:    f.AvatarURL,
		GuildName:    f.GuildName,
		Presence:     v1.PresenceStatus(f.Presence),
		LastActivity: f.LastActivity,
		LastSeenAt:   timestamppb.New(f.LastSeenAt),
		FriendsSince: timestamppb.New(f.FriendsSince),
		IsFavorite:   f.IsFavorite,
	}
}

func mapRequest(r *model.FriendRequest) *v1.FriendRequest {
	if r == nil {
		return nil
	}
	return &v1.FriendRequest{
		Id:           r.ID.String(),
		FromUserId:   r.FromUserID.String(),
		FromUsername: r.FromUsername,
		ToUserId:     r.ToUserID.String(),
		Message:      r.Message,
		CreatedAt:    timestamppb.New(r.CreatedAt),
	}
}

func mapRequests(list []*model.FriendRequest) []*v1.FriendRequest {
	out := make([]*v1.FriendRequest, 0, len(list))
	for _, r := range list {
		out = append(out, mapRequest(r))
	}
	return out
}
