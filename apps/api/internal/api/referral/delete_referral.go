package referral

import (
	"context"

	"api/internal/model"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/referral/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) DeleteReferral(ctx context.Context, req *v1.DeleteReferralRequest) (*v1.ReferralStatusResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	referralID, err := uuid.Parse(req.ReferralId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_REFERRAL_ID", "invalid referral id")
	}
	if err := i.service.DeleteReferral(ctx, referralID, user); err != nil {
		return nil, err
	}
	return &v1.ReferralStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
