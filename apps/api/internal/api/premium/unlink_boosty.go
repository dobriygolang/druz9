package premium

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/apihelpers"
	v1 "api/pkg/api/premium/v1"
)

func (i *Implementation) UnlinkBoosty(ctx context.Context, req *v1.UnlinkBoostyRequest) (*v1.UnlinkBoostyResponse, error) {
	_ = req
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	if err := i.repo.Delete(ctx, user.ID); err != nil {
		klog.Errorf("premium: unlink: %v", err)
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to unlink")
	}

	return &v1.UnlinkBoostyResponse{Status: "unlinked"}, nil
}
