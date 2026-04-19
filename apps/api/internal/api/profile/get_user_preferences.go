package profile

import (
	"context"
	"fmt"

	kratoserrors "github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	v1 "api/pkg/api/profile/v1"
)

// GetUserPreferences — ADR-005. Always returns a row (defaults applied
// server-side on first call).
func (i *Implementation) GetUserPreferences(ctx context.Context, _ *v1.GetUserPreferencesRequest) (*v1.UserPreferences, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}
	if i.prefsRepo == nil {
		return nil, kratoserrors.InternalServer("NOT_CONFIGURED", "preferences repo missing")
	}
	p, err := i.prefsRepo.GetOrInitPreferences(ctx, user.ID)
	if err != nil || p == nil {
		return nil, kratoserrors.InternalServer("INTERNAL", "failed to load preferences")
	}
	return mapPrefsToProto(p.LayoutDensity, p.Locale), nil
}
