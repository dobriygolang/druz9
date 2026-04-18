package profile

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/apihelpers"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) GetWallet(ctx context.Context, _ *v1.GetWalletRequest) (*v1.GetWalletResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	balance, err := i.walletRepo.GetOrCreate(ctx, user.ID)
	if err != nil {
		klog.Errorf("profile: get wallet user=%s: %v", user.ID, err)
		return nil, errors.InternalServer("INTERNAL", "failed to load wallet")
	}
	return &v1.GetWalletResponse{
		Gold:   balance.Gold,
		Gems:   balance.Gems,
		Shards: balance.Shards,
	}, nil
}
