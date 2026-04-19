package season_pass

import (
	"context"
	"fmt"
	"time"

	kerrs "github.com/go-kratos/kratos/v2/errors"
	klog "github.com/go-kratos/kratos/v2/log"
	"google.golang.org/protobuf/types/known/timestamppb"

	"api/internal/apihelpers"
	"api/internal/model"
	v1 "api/pkg/api/season_pass/v1"
)

func (i *Implementation) AdminListPasses(ctx context.Context, _ *v1.AdminListPassesRequest) (*v1.AdminListPassesResponse, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, fmt.Errorf("require admin: %w", err)
	}
	passes, err := i.service.AdminListPasses(ctx)
	if err != nil {
		klog.Errorf("admin season pass: list: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to list passes")
	}
	rows := make([]*v1.SeasonPassAdminRow, 0, len(passes))
	for _, p := range passes {
		rows = append(rows, mapPassAdminRow(p, nil))
	}
	return &v1.AdminListPassesResponse{Passes: rows}, nil
}

func (i *Implementation) AdminCreatePass(ctx context.Context, req *v1.AdminCreatePassRequest) (*v1.SeasonPassAdminRow, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, fmt.Errorf("require admin: %w", err)
	}
	startsAt, err := time.Parse(time.RFC3339, req.GetStartsAt())
	if err != nil {
		return nil, kerrs.BadRequest("INVALID_STARTS_AT", "starts_at must be RFC3339")
	}
	endsAt, err := time.Parse(time.RFC3339, req.GetEndsAt())
	if err != nil {
		return nil, kerrs.BadRequest("INVALID_ENDS_AT", "ends_at must be RFC3339")
	}
	p := &model.SeasonPass{
		SeasonNumber:     req.GetSeasonNumber(),
		Title:            req.GetTitle(),
		Subtitle:         req.GetSubtitle(),
		StartsAt:         startsAt,
		EndsAt:           endsAt,
		MaxTier:          req.GetMaxTier(),
		XPPerTier:        req.GetXpPerTier(),
		PremiumPriceGems: req.GetPremiumPriceGems(),
	}
	created, err := i.service.AdminCreatePass(ctx, p)
	if err != nil {
		klog.Errorf("admin season pass: create: %v", err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to create pass")
	}
	return mapPassAdminRow(created, nil), nil
}

func (i *Implementation) AdminUpdatePass(ctx context.Context, req *v1.AdminUpdatePassRequest) (*v1.SeasonPassAdminRow, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, fmt.Errorf("require admin: %w", err)
	}
	id, err := apihelpers.ParseUUID(req.GetId(), "INVALID_ID", "id")
	if err != nil {
		return nil, fmt.Errorf("parse uuid: %w", err)
	}
	startsAt, err := time.Parse(time.RFC3339, req.GetStartsAt())
	if err != nil {
		return nil, kerrs.BadRequest("INVALID_STARTS_AT", "starts_at must be RFC3339")
	}
	endsAt, err := time.Parse(time.RFC3339, req.GetEndsAt())
	if err != nil {
		return nil, kerrs.BadRequest("INVALID_ENDS_AT", "ends_at must be RFC3339")
	}
	p := &model.SeasonPass{
		ID:               id,
		Title:            req.GetTitle(),
		Subtitle:         req.GetSubtitle(),
		StartsAt:         startsAt,
		EndsAt:           endsAt,
		MaxTier:          req.GetMaxTier(),
		XPPerTier:        req.GetXpPerTier(),
		PremiumPriceGems: req.GetPremiumPriceGems(),
	}
	updated, err := i.service.AdminUpdatePass(ctx, p)
	if err != nil {
		klog.Errorf("admin season pass: update %s: %v", id, err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to update pass")
	}
	return mapPassAdminRow(updated, nil), nil
}

func (i *Implementation) AdminDeletePass(ctx context.Context, req *v1.AdminDeletePassRequest) (*v1.AdminSeasonPassDeleteResponse, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, fmt.Errorf("require admin: %w", err)
	}
	id, err := apihelpers.ParseUUID(req.GetId(), "INVALID_ID", "id")
	if err != nil {
		return nil, fmt.Errorf("parse uuid: %w", err)
	}
	if err := i.service.AdminDeletePass(ctx, id); err != nil {
		klog.Errorf("admin season pass: delete %s: %v", id, err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to delete pass")
	}
	return &v1.AdminSeasonPassDeleteResponse{Ok: true}, nil
}

func (i *Implementation) AdminUpsertTier(ctx context.Context, req *v1.AdminUpsertTierRequest) (*v1.SeasonPassTier, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, fmt.Errorf("require admin: %w", err)
	}
	passID, err := apihelpers.ParseUUID(req.GetSeasonPassId(), "INVALID_PASS_ID", "season_pass_id")
	if err != nil {
		return nil, fmt.Errorf("parse uuid: %w", err)
	}
	t := &model.SeasonPassTier{
		Tier:                req.GetTier(),
		FreeRewardKind:      model.RewardKind(req.GetFreeRewardKind()),
		FreeRewardAmount:    req.GetFreeRewardAmount(),
		FreeRewardLabel:     req.GetFreeRewardLabel(),
		PremiumRewardKind:   model.RewardKind(req.GetPremiumRewardKind()),
		PremiumRewardAmount: req.GetPremiumRewardAmount(),
		PremiumRewardLabel:  req.GetPremiumRewardLabel(),
	}
	updated, err := i.service.AdminUpsertTier(ctx, passID, t)
	if err != nil {
		klog.Errorf("admin season pass: upsert tier %d pass=%s: %v", req.GetTier(), passID, err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to upsert tier")
	}
	return mapTier(updated), nil
}

func (i *Implementation) AdminDeleteTier(ctx context.Context, req *v1.AdminDeleteTierRequest) (*v1.AdminSeasonPassDeleteResponse, error) {
	if _, err := apihelpers.RequireAdmin(ctx); err != nil {
		return nil, fmt.Errorf("require admin: %w", err)
	}
	passID, err := apihelpers.ParseUUID(req.GetSeasonPassId(), "INVALID_PASS_ID", "season_pass_id")
	if err != nil {
		return nil, fmt.Errorf("parse uuid: %w", err)
	}
	if err := i.service.AdminDeleteTier(ctx, passID, req.GetTier()); err != nil {
		klog.Errorf("admin season pass: delete tier %d pass=%s: %v", req.GetTier(), passID, err)
		return nil, kerrs.InternalServer("INTERNAL", "failed to delete tier")
	}
	return &v1.AdminSeasonPassDeleteResponse{Ok: true}, nil
}

func mapPassAdminRow(p *model.SeasonPass, tiers []*model.SeasonPassTier) *v1.SeasonPassAdminRow {
	row := &v1.SeasonPassAdminRow{
		Id:               p.ID.String(),
		SeasonNumber:     p.SeasonNumber,
		Title:            p.Title,
		Subtitle:         p.Subtitle,
		StartsAt:         timestamppb.New(p.StartsAt),
		EndsAt:           timestamppb.New(p.EndsAt),
		MaxTier:          p.MaxTier,
		XpPerTier:        p.XPPerTier,
		PremiumPriceGems: p.PremiumPriceGems,
	}
	for _, t := range tiers {
		row.Tiers = append(row.Tiers, mapTier(t))
	}
	return row
}
