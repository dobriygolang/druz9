package profile

import (
	"context"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) UpdateLocation(ctx context.Context, req *v1.UpdateLocationRequest) (*v1.ProfileResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	response, err := i.service.UpdateLocation(ctx, user.ID, model.CompleteRegistrationRequest{
		Region:    req.GetRegion(),
		Country:   req.GetCountry(),
		City:      req.GetCity(),
		Latitude:  req.GetLatitude(),
		Longitude: req.GetLongitude(),
	})
	if err != nil {
		if stdErr := errors.FromError(err); stdErr == nil {
			if errors.Is(err, profileerrors.ErrInvalidPayload) {
				return nil, errors.BadRequest("INVALID_PAYLOAD", "invalid payload")
			}
		}
		return nil, fmt.Errorf("update location: %w", err)
	}

	return mapProfileResponse(response), nil
}
