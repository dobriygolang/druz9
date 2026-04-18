package shop

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	v1 "api/pkg/api/shop/v1"
)

func (i *Implementation) GetInventory(ctx context.Context, _ *v1.GetInventoryRequest) (*v1.GetInventoryResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := i.service.GetInventory(ctx, user.ID)
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to load inventory")
	}
	out := make([]*v1.OwnedItem, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapOwned(r))
	}
	return &v1.GetInventoryResponse{Items: out}, nil
}
