package referral

import (
	"api/internal/model"
	v1 "api/pkg/api/referral/v1"

	"google.golang.org/protobuf/types/known/timestamppb"
)

func mapReferral(item *model.Referral) *v1.Referral {
	if item == nil {
		return nil
	}
	return &v1.Referral{
		Id:             item.ID.String(),
		UserId:         item.UserID,
		AuthorName:     item.AuthorName,
		Title:          item.Title,
		Company:        item.Company,
		VacancyUrl:     item.VacancyURL,
		Description:    item.Description,
		Experience:     item.Experience,
		Location:       item.Location,
		EmploymentType: mapEmploymentType(item.EmploymentType),
		IsOwner:        item.IsOwner,
		CreatedAt:      timestamppb.New(item.CreatedAt),
	}
}
