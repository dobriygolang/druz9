package circle

import (
	"context"

	"api/internal/model"
	"api/internal/notiftext"
	v1 "api/pkg/api/circle/v1"
	commonv1 "api/pkg/api/common/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) InviteToCircle(ctx context.Context, req *v1.InviteToCircleRequest) (*v1.InviteToCircleResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	circleID, err := uuid.Parse(req.CircleId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_CIRCLE_ID", "invalid circle id")
	}

	inviteeID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user id")
	}

	if err := i.service.InviteToCircle(ctx, circleID, user.ID, inviteeID); err != nil {
		return nil, err
	}

	// Notify: circle_invite — send to the invitee.
	if i.notif != nil {
		go func() {
			i.notif.Send(ctx, inviteeID.String(), "circle_invite",
				notiftext.CircleInviteTitle(),
				notiftext.CircleInviteBody(user.FirstName),
				map[string]any{"circle_id": circleID.String(), "inviter_id": user.ID.String()})
		}()
	}

	return &v1.InviteToCircleResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_INVITED}, nil
}
