package social

import (
	"context"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/timestamppb"

	socialdomain "api/internal/domain/social"
	"api/internal/model"
	v1 "api/pkg/api/social/v1"
)

type Service interface {
	ListFriends(ctx context.Context, userID uuid.UUID, limit, offset int32) (*model.FriendList, error)
	ListPendingRequests(ctx context.Context, userID uuid.UUID) (*model.FriendRequestBuckets, error)
	SendFriendRequest(ctx context.Context, fromID uuid.UUID, toUsername, message string) (*model.FriendRequest, error)
	AcceptFriendRequest(ctx context.Context, viewerID, requestID uuid.UUID) (*model.Friend, error)
	DeclineFriendRequest(ctx context.Context, viewerID, requestID uuid.UUID) error
	RemoveFriend(ctx context.Context, viewerID, otherID uuid.UUID) error
}

type Implementation struct {
	v1.UnimplementedSocialServiceServer
	service Service
}

func New(s Service) *Implementation                      { return &Implementation{service: s} }
func (i *Implementation) GetDescription() grpc.ServiceDesc { return v1.SocialService_ServiceDesc }

// ---------- handlers ----------

func (i *Implementation) ListFriends(ctx context.Context, req *v1.ListFriendsRequest) (*v1.ListFriendsResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	result, err := i.service.ListFriends(ctx, user.ID, req.GetLimit(), req.GetOffset())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list friends")
	}
	out := make([]*v1.Friend, 0, len(result.Friends))
	for _, f := range result.Friends {
		out = append(out, mapFriend(f))
	}
	return &v1.ListFriendsResponse{Friends: out, Total: result.Total, OnlineCount: result.OnlineCount}, nil
}

func (i *Implementation) ListPendingRequests(ctx context.Context, _ *v1.ListPendingRequestsRequest) (*v1.ListPendingRequestsResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	buckets, err := i.service.ListPendingRequests(ctx, user.ID)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to list requests")
	}
	return &v1.ListPendingRequestsResponse{
		Incoming: mapRequests(buckets.Incoming),
		Outgoing: mapRequests(buckets.Outgoing),
	}, nil
}

func (i *Implementation) SendFriendRequest(ctx context.Context, req *v1.SendFriendRequestRequest) (*v1.SendFriendRequestResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	out, err := i.service.SendFriendRequest(ctx, user.ID, req.GetToUsername(), req.GetMessage())
	if err != nil {
		return nil, mapSendErr(err)
	}
	return &v1.SendFriendRequestResponse{Request: mapRequest(out)}, nil
}

func (i *Implementation) AcceptFriendRequest(ctx context.Context, req *v1.AcceptFriendRequestRequest) (*v1.AcceptFriendRequestResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	id, perr := uuid.Parse(req.GetRequestId())
	if perr != nil {
		return nil, errors.BadRequest("INVALID_REQUEST_ID", "request_id must be a UUID")
	}
	f, err := i.service.AcceptFriendRequest(ctx, user.ID, id)
	if err != nil {
		return nil, mapAcceptErr(err)
	}
	return &v1.AcceptFriendRequestResponse{Friend: mapFriend(f)}, nil
}

func (i *Implementation) DeclineFriendRequest(ctx context.Context, req *v1.DeclineFriendRequestRequest) (*v1.DeclineFriendRequestResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	id, perr := uuid.Parse(req.GetRequestId())
	if perr != nil {
		return nil, errors.BadRequest("INVALID_REQUEST_ID", "request_id must be a UUID")
	}
	if err := i.service.DeclineFriendRequest(ctx, user.ID, id); err != nil {
		return nil, mapAcceptErr(err)
	}
	return &v1.DeclineFriendRequestResponse{Ok: true}, nil
}

func (i *Implementation) RemoveFriend(ctx context.Context, req *v1.RemoveFriendRequest) (*v1.RemoveFriendResponse, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	other, perr := uuid.Parse(req.GetUserId())
	if perr != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "user_id must be a UUID")
	}
	if err := i.service.RemoveFriend(ctx, user.ID, other); err != nil {
		if goerr.Is(err, socialdomain.ErrNotFriends) {
			return nil, errors.NotFound("NOT_FRIENDS", "no friendship to remove")
		}
		return nil, errors.InternalServer("INTERNAL", "failed to remove friend")
	}
	return &v1.RemoveFriendResponse{Ok: true}, nil
}

// ---------- helpers ----------

func requireUser(ctx context.Context) (*model.User, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok || user == nil {
		return nil, errors.Unauthorized("UNAUTHORIZED", "authentication required")
	}
	return user, nil
}

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

func mapSendErr(err error) error {
	switch {
	case goerr.Is(err, socialdomain.ErrUserNotFound):
		return errors.NotFound("USER_NOT_FOUND", "user not found")
	case goerr.Is(err, socialdomain.ErrCannotFriendSelf):
		return errors.BadRequest("CANNOT_FRIEND_SELF", "you cannot friend yourself")
	case goerr.Is(err, socialdomain.ErrAlreadyFriends):
		return errors.Conflict("ALREADY_FRIENDS", "already friends")
	case goerr.Is(err, socialdomain.ErrRequestPending):
		return errors.Conflict("REQUEST_PENDING", "a friend request is already pending")
	case goerr.Is(err, socialdomain.ErrMessageTooLong):
		return errors.BadRequest("MESSAGE_TOO_LONG", "message exceeds 280 chars")
	default:
		return errors.InternalServer("INTERNAL", "failed to send request")
	}
}
func mapAcceptErr(err error) error {
	switch {
	case goerr.Is(err, socialdomain.ErrRequestNotFound):
		return errors.NotFound("REQUEST_NOT_FOUND", "request not found")
	case goerr.Is(err, socialdomain.ErrNotRecipient):
		return errors.Forbidden("NOT_RECIPIENT", "only the recipient can accept/decline")
	case goerr.Is(err, socialdomain.ErrAlreadyResolved):
		return errors.Conflict("REQUEST_RESOLVED", "request already resolved")
	default:
		return errors.InternalServer("INTERNAL", "failed to update request")
	}
}
