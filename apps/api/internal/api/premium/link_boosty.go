package premium

import (
	"context"
	"errors"
	"time"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"

	"api/internal/apihelpers"
	"api/internal/boosty"
	premiumdata "api/internal/data/premium"
	v1 "api/pkg/api/premium/v1"
)

func (i *Implementation) LinkBoosty(ctx context.Context, req *v1.LinkBoostyRequest) (*v1.PremiumStatus, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}
	if i.client == nil {
		return nil, kratoserrors.ServiceUnavailable("NOT_CONFIGURED", "Boosty integration is not enabled")
	}
	email := req.GetEmail()
	if email == "" {
		return nil, kratoserrors.BadRequest("BAD_REQUEST", "email required")
	}

	info, err := i.client.CheckSubscriber(ctx, email)
	if errors.Is(err, boosty.ErrNotSubscribed) {
		return nil, kratoserrors.New(402, "NOT_SUBSCRIBED", "this email is not found among active Boosty subscribers")
	}
	if errors.Is(err, boosty.ErrTokenExpired) {
		klog.Errorf("premium: boosty token expired - update BOOSTY_ACCESS_TOKEN")
		return nil, kratoserrors.ServiceUnavailable("BOOSTY_ERROR", "Boosty service is temporarily unavailable")
	}
	if err != nil {
		klog.Errorf("premium: boosty check: %v", err)
		return nil, kratoserrors.ServiceUnavailable("BOOSTY_ERROR", "could not verify subscription with Boosty")
	}

	expiresAt := info.ExpiresAt
	maxExpiry := time.Now().Add(31 * 24 * time.Hour)
	if expiresAt.IsZero() || expiresAt.After(maxExpiry) {
		expiresAt = maxExpiry
	}

	if err := i.repo.Upsert(ctx, premiumdata.Row{
		UserID:      user.ID,
		Source:      "boosty",
		BoostyEmail: email,
		Active:      true,
		StartsAt:    time.Now(),
		ExpiresAt:   expiresAt,
	}); err != nil {
		klog.Errorf("premium: upsert: %v", err)
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to activate premium")
	}

	return &v1.PremiumStatus{
		Active:      true,
		Source:      "boosty",
		BoostyEmail: email,
		ExpiresAt:   expiresAt.UTC().Format(time.RFC3339),
	}, nil
}
