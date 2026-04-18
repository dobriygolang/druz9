package referral

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/referral/v1"
)

func (i *Implementation) UpdateReferral(ctx context.Context, req *v1.UpdateReferralRequest) (*v1.ReferralResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	referralID, err := apihelpers.ParseUUID(req.GetReferralId(), "INVALID_REFERRAL_ID", "referral_id")
	if err != nil {
		return nil, fmt.Errorf("parse referral id: %w", err)
	}
	item, err := i.service.UpdateReferral(ctx, referralID, user, model.UpdateReferralRequest{
		Title:          req.GetReferral().GetTitle(),
		Company:        req.GetReferral().GetCompany(),
		VacancyURL:     req.GetReferral().GetVacancyUrl(),
		Description:    req.GetReferral().GetDescription(),
		Experience:     req.GetReferral().GetExperience(),
		Location:       req.GetReferral().GetLocation(),
		EmploymentType: unmapEmploymentType(req.GetReferral().GetEmploymentType()),
	})
	if err != nil {
		return nil, fmt.Errorf("update referral: %w", err)
	}
	return &v1.ReferralResponse{Referral: mapReferral(item)}, nil
}
