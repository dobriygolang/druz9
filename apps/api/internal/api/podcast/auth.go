package podcast

import (
	"context"

	"api/internal/model"

	"github.com/go-kratos/kratos/v2/errors"
)

func requireAdmin(ctx context.Context) (*model.User, error) {
	user, err := requireUser(ctx)
	if err != nil {
		return nil, err
	}
	if !user.IsAdmin {
		return nil, errors.Forbidden("FORBIDDEN", "admin access required")
	}
	return user, nil
}

func requireUser(ctx context.Context) (*model.User, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	return user, nil
}
