package profile

import (
	"context"
	"fmt"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	v1 "api/pkg/api/profile/v1"
)

func (i *Implementation) UpdateUserPreferences(ctx context.Context, req *v1.UpdateUserPreferencesRequest) (*v1.UserPreferences, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.prefsRepo == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "preferences repo missing")
	}
	density := densityFromProto(req.GetLayoutDensity())
	p, err := i.prefsRepo.UpsertPreferences(ctx, user.ID, density, req.GetLocale())
	if err != nil || p == nil {
		return nil, kratoserrors.BadRequest("INVALID_PREFERENCES", "failed to update preferences")
	}
	return mapPrefsToProto(p.LayoutDensity, p.Locale), nil
}

func densityFromProto(d v1.LayoutDensity) string {
	switch d {
	case v1.LayoutDensity_LAYOUT_DENSITY_COMPACT:
		return "compact"
	case v1.LayoutDensity_LAYOUT_DENSITY_COMFORTABLE:
		return "comfortable"
	}
	return ""
}

func mapPrefsToProto(density, locale string) *v1.UserPreferences {
	d := v1.LayoutDensity_LAYOUT_DENSITY_COMFORTABLE
	if density == "compact" {
		d = v1.LayoutDensity_LAYOUT_DENSITY_COMPACT
	}
	return &v1.UserPreferences{
		LayoutDensity: d,
		Locale:        locale,
	}
}
