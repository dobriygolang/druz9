package social

import (
	"context"
	goerr "errors"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	socialdomain "api/internal/domain/social"
	v1 "api/pkg/api/social/v1"
)

func (i *Implementation) ListPendingRequests(ctx context.Context, _ *v1.ListPendingRequestsRequest) (*v1.ListPendingRequestsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
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
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	out, err := i.service.SendFriendRequest(ctx, user.ID, req.GetToUsername(), req.GetMessage())
	if err != nil {
		return nil, mapSendErr(err)
	}
	return &v1.SendFriendRequestResponse{Request: mapRequest(out)}, nil
}

func (i *Implementation) AcceptFriendRequest(ctx context.Context, req *v1.AcceptFriendRequestRequest) (*v1.AcceptFriendRequestResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	id, perr := apihelpers.ParseUUID(req.GetRequestId(), "INVALID_REQUEST_ID", "request_id")
	if perr != nil {
		return nil, fmt.Errorf("parse request_id: %w", perr)
	}
	f, err := i.service.AcceptFriendRequest(ctx, user.ID, id)
	if err != nil {
		return nil, mapAcceptErr(err)
	}
	return &v1.AcceptFriendRequestResponse{Friend: mapFriend(f)}, nil
}

func (i *Implementation) DeclineFriendRequest(ctx context.Context, req *v1.DeclineFriendRequestRequest) (*v1.DeclineFriendRequestResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	id, perr := apihelpers.ParseUUID(req.GetRequestId(), "INVALID_REQUEST_ID", "request_id")
	if perr != nil {
		return nil, fmt.Errorf("parse request_id: %w", perr)
	}
	if err := i.service.DeclineFriendRequest(ctx, user.ID, id); err != nil {
		return nil, mapAcceptErr(err)
	}
	return &v1.DeclineFriendRequestResponse{Ok: true}, nil
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
