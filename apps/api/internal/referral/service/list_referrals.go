package service

import (
	"context"

	"api/internal/model"
)

// ListReferrals retrieves referrals with pagination.
func (s *Service) ListReferrals(ctx context.Context, user *model.User, opts model.ListReferralsOptions) (*model.ListReferralsResponse, error) {
	return s.repo.ListReferrals(ctx, user, opts)
}
