package geo

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	v1 "api/pkg/api/geo/v1"
)

func (i *Implementation) CommunityMap(ctx context.Context, req *v1.CommunityMapRequest) (*v1.CommunityMapResponse, error) {
	_ = req

	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}

	response, err := i.service.CommunityMap(ctx, user.ID.String())
	if err != nil {
		return nil, fmt.Errorf("community map: %w", err)
	}

	return mapCommunityMapResponse(response), nil
}
