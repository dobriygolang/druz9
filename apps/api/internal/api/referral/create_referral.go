package referral

import (
	"context"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/referral/v1"
)

func (i *Implementation) CreateReferral(ctx context.Context, req *v1.CreateReferralRequest) (*v1.ReferralResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	item, err := i.service.CreateReferral(ctx, user, model.CreateReferralRequest{
		Title:          req.Referral.Title,
		Company:        req.Referral.Company,
		VacancyURL:     req.Referral.VacancyUrl,
		Description:    req.Referral.Description,
		Experience:     req.Referral.Experience,
		Location:       req.Referral.Location,
		EmploymentType: unmapEmploymentType(req.Referral.EmploymentType),
	})
	if err != nil {
		return nil, err
	}
	return &v1.ReferralResponse{Referral: mapReferral(item)}, nil
}
