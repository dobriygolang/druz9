package referral

import (
	"api/internal/model"
	v1 "api/pkg/api/referral/v1"
)

func mapEmploymentType(empType model.EmploymentType) v1.EmploymentType {
	switch empType {
	case model.EmploymentTypeFullTime:
		return v1.EmploymentType_EMPLOYMENT_TYPE_FULL_TIME
	case model.EmploymentTypePartTime:
		return v1.EmploymentType_EMPLOYMENT_TYPE_PART_TIME
	case model.EmploymentTypeContract:
		return v1.EmploymentType_EMPLOYMENT_TYPE_CONTRACT
	case model.EmploymentTypeInternship:
		return v1.EmploymentType_EMPLOYMENT_TYPE_INTERNSHIP
	case model.EmploymentTypeRemote:
		return v1.EmploymentType_EMPLOYMENT_TYPE_REMOTE
	default:
		return v1.EmploymentType_EMPLOYMENT_TYPE_UNSPECIFIED
	}
}

func unmapEmploymentType(empType v1.EmploymentType) model.EmploymentType {
	switch empType {
	case v1.EmploymentType_EMPLOYMENT_TYPE_FULL_TIME:
		return model.EmploymentTypeFullTime
	case v1.EmploymentType_EMPLOYMENT_TYPE_PART_TIME:
		return model.EmploymentTypePartTime
	case v1.EmploymentType_EMPLOYMENT_TYPE_CONTRACT:
		return model.EmploymentTypeContract
	case v1.EmploymentType_EMPLOYMENT_TYPE_INTERNSHIP:
		return model.EmploymentTypeInternship
	case v1.EmploymentType_EMPLOYMENT_TYPE_REMOTE:
		return model.EmploymentTypeRemote
	default:
		return model.EmploymentTypeUnknown
	}
}
