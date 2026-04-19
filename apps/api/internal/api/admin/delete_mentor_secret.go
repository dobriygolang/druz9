package admin

import (
	"context"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"

	v1 "api/pkg/api/admin/v1"
)

func (i *AIMentorImpl) DeleteMentorSecret(ctx context.Context, req *v1.DeleteMentorSecretRequest) (*v1.DeleteAIMentorResponse, error) {
	if _, err := uuid.Parse(req.GetMentorId()); err != nil {
		return nil, kratoserrors.BadRequest("INVALID_MENTOR_ID", "invalid mentor_id")
	}
	if i.repo == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "ai mentor repo missing")
	}
	id, _ := uuid.Parse(req.GetMentorId())
	if err := i.repo.DeleteSecret(ctx, id); err != nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to delete secret")
	}
	return &v1.DeleteAIMentorResponse{Ok: true}, nil
}
