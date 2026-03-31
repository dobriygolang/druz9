package profile

import (
	"context"

	profileerrors "api/internal/errors/profile"
	"api/internal/metrics"
	"api/internal/model"
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) CompleteRegistration(ctx context.Context, req *v1.CompleteRegistrationRequest) (*v1.ProfileResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	response, rawToken, expiresAt, err := i.service.CompleteRegistration(
		ctx,
		user.ID,
		model.CompleteRegistrationRequest{
			Region:    req.Region,
			Country:   req.Country,
			City:      req.City,
			Latitude:  req.Latitude,
			Longitude: req.Longitude,
		},
	)
	if err != nil {
		if stdErr := errors.FromError(err); stdErr == nil {
			if errors.Is(err, profileerrors.ErrInvalidPayload) {
				return nil, errors.BadRequest("INVALID_PAYLOAD", "invalid payload")
			}
		}
		return nil, err
	}

	i.cookie.SetSessionCookie(ctx, rawToken, expiresAt)

	metrics.IncUserRegistered()

	return mapProfileResponse(response), nil
}
