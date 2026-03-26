package geo

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/geo/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) CommunityMap(ctx context.Context, req *v1.CommunityMapRequest) (*v1.CommunityMapResponse, error) {
	_ = req

	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}

	response, err := i.service.CommunityMap(ctx, user.ID.String())
	if err != nil {
		return nil, err
	}

	return mapCommunityMapResponse(response), nil
}
