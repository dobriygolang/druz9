package inbox

import (
	"context"
	goerr "errors"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	inboxdomain "api/internal/domain/inbox"
	v1 "api/pkg/api/inbox/v1"
)

func (i *Implementation) GetThread(ctx context.Context, req *v1.GetThreadRequest) (*v1.GetThreadResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	threadID, err := apihelpers.ParseUUID(req.GetThreadId(), "INVALID_THREAD_ID", "thread_id")
	if err != nil {
		return nil, fmt.Errorf("parse thread id: %w", err)
	}

	result, err := i.service.GetThread(ctx, user.ID, threadID)
	if err != nil {
		switch {
		case goerr.Is(err, inboxdomain.ErrThreadNotFound):
			return nil, errors.NotFound("THREAD_NOT_FOUND", "thread does not exist")
		case goerr.Is(err, inboxdomain.ErrThreadNotOwned):
			return nil, errors.Forbidden("THREAD_NOT_OWNED", "thread belongs to another user")
		default:
			return nil, errors.InternalServer("INTERNAL", "failed to load thread")
		}
	}

	messages := make([]*v1.InboxMessage, 0, len(result.Messages))
	for _, m := range result.Messages {
		messages = append(messages, mapMessage(m))
	}
	return &v1.GetThreadResponse{
		Thread:   mapThread(result.Thread),
		Messages: messages,
	}, nil
}
