package model

import (
	"time"

	"github.com/google/uuid"
)

type Referral struct {
	ID                       uuid.UUID
	UserID                   string
	AuthorName               string
	AuthorTelegramUsername   string
	AuthorTelegramProfileURL string
	Title                    string
	Company                  string
	VacancyURL               string
	Description              string
	Experience               string
	Location                 string
	EmploymentType           EmploymentType
	IsOwner                  bool
	CreatedAt                time.Time
	UpdatedAt                time.Time
}

type CreateReferralRequest struct {
	Title          string
	Company        string
	VacancyURL     string
	Description    string
	Experience     string
	Location       string
	EmploymentType EmploymentType
}

type UpdateReferralRequest = CreateReferralRequest

type ListReferralsOptions struct {
	Limit  int32
	Offset int32
}

const (
	DefaultReferralsLimit = 20
	MaxReferralsLimit     = 100
)

type EmploymentType int

const (
	EmploymentTypeUnknown EmploymentType = iota
	EmploymentTypeFullTime
	EmploymentTypePartTime
	EmploymentTypeContract
	EmploymentTypeInternship
	EmploymentTypeRemote
)

func (e EmploymentType) String() string {
	switch e {
	case EmploymentTypeFullTime:
		return "full_time"
	case EmploymentTypePartTime:
		return "part_time"
	case EmploymentTypeContract:
		return "contract"
	case EmploymentTypeInternship:
		return "internship"
	case EmploymentTypeRemote:
		return "remote"
	default:
		return ""
	}
}

func EmploymentTypeFromString(s string) EmploymentType {
	switch s {
	case "full_time":
		return EmploymentTypeFullTime
	case "part_time":
		return EmploymentTypePartTime
	case "contract":
		return EmploymentTypeContract
	case "internship":
		return EmploymentTypeInternship
	case "remote":
		return EmploymentTypeRemote
	default:
		return EmploymentTypeUnknown
	}
}

type ListReferralsResponse struct {
	Referrals   []*Referral
	Limit       int32
	Offset      int32
	TotalCount  int32
	HasNextPage bool
}
