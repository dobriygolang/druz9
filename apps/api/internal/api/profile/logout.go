package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) Logout(ctx context.Context, _ *v1.LogoutRequest) (*v1.ProfileStatusResponse, error) {
	session, ok := model.SessionFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	if err := i.service.Logout(ctx, session.TokenHash); err != nil {
		return nil, err
	}

	i.cookie.ClearSessionCookie(ctx)
	return &v1.ProfileStatusResponse{Status: "ok"}, nil
}
