package referral

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/referral/v1"

	"github.com/go-kratos/kratos/v2/errors"
	"github.com/google/uuid"
)

func (i *Implementation) UpdateReferral(ctx context.Context, req *v1.UpdateReferralRequest) (*v1.ReferralResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	referralID, err := uuid.Parse(req.ReferralId)
	if err != nil {
		return nil, errors.BadRequest("INVALID_REFERRAL_ID", "invalid referral id")
	}
	item, err := i.service.UpdateReferral(ctx, referralID, user, model.UpdateReferralRequest{
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
