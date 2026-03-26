package admin

import (
	"context"

	v1 "api/pkg/api/admin/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) DeleteUser(ctx context.Context, req *v1.DeleteUserRequest) (*v1.AdminStatusResponse, error) {
	userID, err := uuid.Parse(req.UserId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_USER_ID", "invalid user id")
	}
	if err := i.service.DeleteUser(ctx, userID); err != nil {
		return nil, err
	}
	return &v1.AdminStatusResponse{Status: "ok"}, nil
}
