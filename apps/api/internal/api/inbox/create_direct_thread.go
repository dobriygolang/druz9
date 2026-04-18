package inbox

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	v1 "api/pkg/api/inbox/v1"
)

func (i *Implementation) CreateDirectThread(ctx context.Context, req *v1.CreateDirectThreadRequest) (*v1.CreateDirectThreadResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	recipientID, err := apihelpers.ParseUUID(req.GetRecipientId(), "INVALID_RECIPIENT_ID", "recipient_id")
	if err != nil {
		return nil, err
	}
	if recipientID == user.ID {
		return nil, errors.BadRequest("INVALID_RECIPIENT", "cannot start a thread with yourself")
	}

	senderName := user.Username
	if senderName == "" {
		senderName = user.FirstName
	}

	recipient, lookupErr := i.userResolver.FindUserByID(ctx, recipientID)
	if lookupErr != nil || recipient == nil {
		return nil, errors.NotFound("RECIPIENT_NOT_FOUND", "recipient user not found")
	}
	recipientName := recipient.Username
	if recipientName == "" {
		recipientName = recipient.FirstName
	}

	subject := "📬 " + senderName
	thread, err := i.service.CreateDirectThread(ctx, user.ID, recipientID, senderName, recipientName, subject)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to create thread")
	}
	return &v1.CreateDirectThreadResponse{ThreadId: thread.ID.String()}, nil
}
