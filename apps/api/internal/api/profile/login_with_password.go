package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) LoginWithPassword(ctx context.Context, req *v1.LoginWithPasswordRequest) (*v1.LoginWithPasswordResponse, error) {
	response, rawToken, expiresAt, err := i.service.LoginWithPassword(ctx, model.PasswordLoginRequest{
		Login:    req.GetLogin(),
		Password: req.GetPassword(),
	})
	if err != nil {
		return nil, err
	}

	i.cookie.SetSessionCookie(ctx, rawToken, expiresAt)
	return &v1.LoginWithPasswordResponse{
		AccessToken:  rawToken,
		RefreshToken: "",
		User:         mapUser(response.User),
	}, nil
}
