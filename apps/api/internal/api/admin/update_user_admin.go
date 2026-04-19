package admin

import (
	"context"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	v1 "api/pkg/api/admin/v1"
	commonv1 "api/pkg/api/common/v1"
)

func (i *Implementation) UpdateUserAdmin(ctx context.Context, req *v1.UpdateUserAdminRequest) (*v1.AdminStatusResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user id")
	}
	if err := i.userManager.UpdateUserAdmin(ctx, userID, req.GetIsAdmin()); err != nil {
		return nil, fmt.Errorf("update user admin: %w", err)
	}
	i.cacheInval.InvalidateProfileCache(userID)
	return &v1.AdminStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
