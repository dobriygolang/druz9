package profile

import (
	"context"
	"fmt"
	"strings"
	"time"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"

	"golang.org/x/crypto/bcrypt"
)

const minPasswordLength = 8

func (s *Service) RegisterWithPassword(ctx context.Context, req model.PasswordRegistrationRequest) (*model.ProfileResponse, string, time.Time, error) {
	normalized, err := normalizePasswordRegistration(req)
	if err != nil {
		return nil, "", time.Time{}, err
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(normalized.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", time.Time{}, fmt.Errorf("hash password: %w", err)
	}

	user, err := s.repo.CreatePasswordUser(ctx, normalized, string(passwordHash))
	if err != nil {
		return nil, "", time.Time{}, err
	}

	rawToken, session, err := s.NewSession(ctx, user.ID)
	if err != nil {
		return nil, "", time.Time{}, err
	}

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: user.Status == model.UserStatusPendingProfile,
	}, rawToken, session.ExpiresAt, nil
}

func (s *Service) LoginWithPassword(ctx context.Context, req model.PasswordLoginRequest) (*model.ProfileResponse, string, time.Time, error) {
	login := strings.ToLower(strings.TrimSpace(req.Login))
	password := strings.TrimSpace(req.Password)
	if login == "" || password == "" {
		return nil, "", time.Time{}, profileerrors.ErrUnauthorized
	}

	user, passwordHash, err := s.repo.FindPasswordUserByLogin(ctx, login)
	if err != nil {
		return nil, "", time.Time{}, err
	}
	if passwordHash == "" {
		return nil, "", time.Time{}, profileerrors.ErrUnauthorized
	}
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		return nil, "", time.Time{}, profileerrors.ErrUnauthorized
	}

	rawToken, session, err := s.NewSession(ctx, user.ID)
	if err != nil {
		return nil, "", time.Time{}, err
	}

	return &model.ProfileResponse{
		User:                 user,
		NeedsProfileComplete: user.Status == model.UserStatusPendingProfile,
	}, rawToken, session.ExpiresAt, nil
}

func normalizePasswordRegistration(req model.PasswordRegistrationRequest) (model.PasswordRegistrationRequest, error) {
	req.Login = strings.ToLower(strings.TrimSpace(req.Login))
	req.Password = strings.TrimSpace(req.Password)
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)

	if req.Login == "" || req.Password == "" {
		return model.PasswordRegistrationRequest{}, profileerrors.ErrInvalidPayload
	}
	if len(req.Password) < minPasswordLength {
		return model.PasswordRegistrationRequest{}, profileerrors.ErrInvalidPayload
	}
	if req.FirstName == "" {
		return model.PasswordRegistrationRequest{}, profileerrors.ErrInvalidPayload
	}

	return req, nil
}
