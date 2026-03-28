package referral

import (
	"context"

	"api/internal/model"
	v1 "api/pkg/api/referral/v1"

	"github.com/go-kratos/kratos/v2/errors"
)

func (i *Implementation) CreateReferral(ctx context.Context, req *v1.CreateReferralRequest) (*v1.ReferralResponse, error) {
	user, ok := model.UserFromContext(ctx)
	if !ok {
		return nil, errors.Unauthorized("UNAUTHORIZED", "unauthorized")
	}
	item, err := i.service.CreateReferral(ctx, user, model.CreateReferralRequest{
		Title:          req.Title,
		Company:        req.Company,
		VacancyURL:     req.VacancyUrl,
		Description:    req.Description,
		Experience:     req.Experience,
		Location:       req.Location,
		EmploymentType: unmapEmploymentType(req.EmploymentType),
	})
	if err != nil {
		return nil, err
	}
	return &v1.ReferralResponse{Referral: mapReferral(item)}, nil
}
