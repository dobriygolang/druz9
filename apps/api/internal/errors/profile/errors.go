package profile

import (
	v1 "api/pkg/api/profile/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

var (
	ErrUnauthorized         = errors.Unauthorized(v1.ErrorReason_UNAUTHORIZED.String(), "unauthorized")
	ErrUserNotFound         = errors.NotFound(v1.ErrorReason_USER_NOT_FOUND.String(), "user not found")
	ErrInvalidPayload       = errors.BadRequest(v1.ErrorReason_INVALID_PAYLOAD.String(), "invalid payload")
	ErrTelegramAlreadyBound = errors.Conflict(v1.ErrorReason_INVALID_PAYLOAD.String(), "telegram already bound to another account")
)
