package skills

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	"api/internal/apihelpers"
)

func requireUser(ctx context.Context) (uuid.UUID, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	return user.ID, nil
}

func internalErr(msg string) error {
	return errors.InternalServer("INTERNAL", msg)
}
