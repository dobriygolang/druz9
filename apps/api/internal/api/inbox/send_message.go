package inbox

import (
	"context"
	goerr "errors"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	inboxdomain "api/internal/domain/inbox"
	v1 "api/pkg/api/inbox/v1"
)

func (i *Implementation) SendMessage(ctx context.Context, req *v1.SendMessageRequest) (*v1.SendMessageResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	threadID, err := apihelpers.ParseUUID(req.GetThreadId(), "INVALID_THREAD_ID", "thread_id")
	if err != nil {
		return nil, err
	}
	if req.GetBody() == "" {
		return nil, errors.BadRequest("INVALID_BODY", "body is required")
	}

	senderName := user.Username
	if senderName == "" {
		senderName = user.ID.String()
	}

	msg, err := i.service.SendMessage(ctx, user.ID, threadID, senderName, req.GetBody())
	if err != nil {
		switch {
		case goerr.Is(err, inboxdomain.ErrThreadNotFound):
			return nil, errors.NotFound("THREAD_NOT_FOUND", "thread does not exist")
		case goerr.Is(err, inboxdomain.ErrThreadNotOwned):
			return nil, errors.Forbidden("THREAD_NOT_OWNED", "thread belongs to another user")
		case goerr.Is(err, inboxdomain.ErrNotInteractive):
			return nil, errors.BadRequest("THREAD_NOT_INTERACTIVE", "this thread does not accept user replies")
		case goerr.Is(err, inboxdomain.ErrMessageEmpty):
			return nil, errors.BadRequest("INVALID_BODY", "body cannot be empty")
		case goerr.Is(err, inboxdomain.ErrMessageTooLong):
			return nil, errors.BadRequest("BODY_TOO_LONG", "body exceeds 4000 characters")
		default:
			return nil, errors.InternalServer("INTERNAL", "failed to send message")
		}
	}
	return &v1.SendMessageResponse{Message: mapMessage(msg)}, nil
}
