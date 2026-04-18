package inbox

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	v1 "api/pkg/api/inbox/v1"
)

func (i *Implementation) GetUnreadCount(ctx context.Context, _ *v1.GetUnreadCountRequest) (*v1.GetUnreadCountResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	unread, err := i.service.GetUnreadCount(ctx, user.ID)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to load unread count")
	}
	return &v1.GetUnreadCountResponse{UnreadTotal: unread}, nil
}
