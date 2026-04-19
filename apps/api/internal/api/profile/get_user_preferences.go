package profile

import (
	"context"

	v1 "api/pkg/api/profile/v1"
)

// GetUserPreferences stub. Please implement it.
func (i *Implementation) GetUserPreferences(ctx context.Context, req *v1.GetUserPreferencesRequest) (*v1.UserPreferences, error) {
	_ = ctx
	_ = req
	panic("TODO: implement GetUserPreferences")
}
