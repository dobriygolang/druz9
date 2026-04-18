package referral

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	commonv1 "api/pkg/api/common/v1"
	v1 "api/pkg/api/referral/v1"
)

func (i *Implementation) DeleteReferral(ctx context.Context, req *v1.DeleteReferralRequest) (*v1.ReferralStatusResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	referralID, err := apihelpers.ParseUUID(req.GetReferralId(), "INVALID_REFERRAL_ID", "referral_id")
	if err != nil {
		return nil, fmt.Errorf("parse referral id: %w", err)
	}
	if err := i.service.DeleteReferral(ctx, referralID, user); err != nil {
		return nil, fmt.Errorf("delete referral: %w", err)
	}
	return &v1.ReferralStatusResponse{Status: commonv1.OperationStatus_OPERATION_STATUS_OK}, nil
}
