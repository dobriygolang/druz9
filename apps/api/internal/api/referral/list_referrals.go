package referral

import (
	"context"
	"fmt"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/referral/v1"
)

func (i *Implementation) ListReferrals(ctx context.Context, req *v1.ListReferralsRequest) (*v1.ListReferralsResponse, error) {
	user := apihelpers.OptionalUser(ctx)

	opts := model.ListReferralsOptions{
		Limit:  req.GetLimit(),
		Offset: req.GetOffset(),
	}

	resp, err := i.service.ListReferrals(ctx, user, opts)
	if err != nil {
		return nil, fmt.Errorf("list referrals: %w", err)
	}

	referrals := make([]*v1.Referral, 0, len(resp.Referrals))
	for _, item := range resp.Referrals {
		referrals = append(referrals, mapReferral(item))
	}

	return &v1.ListReferralsResponse{
		Referrals:   referrals,
		Limit:       resp.Limit,
		Offset:      resp.Offset,
		TotalCount:  resp.TotalCount,
		HasNextPage: resp.HasNextPage,
	}, nil
}
