package profile

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) RegisterWithPassword(ctx context.Context, req *v1.RegisterWithPasswordRequest) (*v1.RegisterWithPasswordResponse, error) {
	response, rawToken, expiresAt, err := i.service.RegisterWithPassword(ctx, model.PasswordRegistrationRequest{
		Login:     req.GetLogin(),
		Password:  req.GetPassword(),
		FirstName: req.GetFirstName(),
		LastName:  req.GetLastName(),
	})
	if err != nil {
		return nil, err
	}

	i.cookie.SetSessionCookie(ctx, rawToken, expiresAt)
	return &v1.RegisterWithPasswordResponse{
		AccessToken:  rawToken,
		RefreshToken: "",
		User:         mapUser(response.User),
	}, nil
}
