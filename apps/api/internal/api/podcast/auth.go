package podcast

import (
	"context"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	"api/internal/model"
)

func requireAdmin(ctx context.Context) (*model.User, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("context: %w", err)
	}
	if !user.IsAdmin {
		return nil, errors.Forbidden("FORBIDDEN", "admin access required")
	}
	return user, nil
}
