package model

import (
	"time"

	"github.com/google/uuid"
)

type Referral struct {
	ID                       uuid.UUID `json:"id"`
	UserID                   string    `json:"user_id"`
	AuthorName               string    `json:"author_name"`
	AuthorTelegramUsername   string    `json:"author_telegram_username"`
	AuthorTelegramProfileURL string    `json:"author_telegram_profile_url"`
	Title                    string    `json:"title"`
	Company                  string    `json:"company"`
	VacancyURL               string    `json:"vacancy_url"`
	Description              string    `json:"description"`
	Experience               string    `json:"experience"`
	Location                 string    `json:"location"`
	EmploymentType           string    `json:"employment_type"`
	IsOwner                  bool      `json:"is_owner"`
	CreatedAt                time.Time `json:"created_at"`
	UpdatedAt                time.Time `json:"updated_at"`
}

type CreateReferralRequest struct {
	Title          string `json:"title"`
	Company        string `json:"company"`
	VacancyURL     string `json:"vacancy_url"`
	Description    string `json:"description"`
	Experience     string `json:"experience"`
	Location       string `json:"location"`
	EmploymentType string `json:"employment_type"`
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

type ListReferralsResponse struct {
	Referrals   []*Referral
	Limit       int32
	Offset      int32
	TotalCount  int32
	HasNextPage bool
}
