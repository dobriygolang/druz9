package notification

import (
	"context"
	"fmt"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	notifclient "api/internal/clients/notification"
	v1 "api/pkg/api/notification/v1"
)

func (i *SettingsImplementation) UpdateNotificationSettings(ctx context.Context, req *v1.UpdateNotificationSettingsRequest) (*v1.UpdateNotificationSettingsResponse, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("require user: %w", err)
	}

	upd := notifclient.SettingsUpdate{
		DuelsEnabled:          req.DuelsEnabled,          //nolint:protogetter // proto generated bool is comparable
		ProgressEnabled:       req.ProgressEnabled,       //nolint:protogetter // proto generated bool is comparable
		GuildsEnabled:         req.GuildsEnabled,         //nolint:protogetter // proto generated bool is comparable
		DailyChallengeEnabled: req.DailyChallengeEnabled, //nolint:protogetter // proto generated bool is comparable
	}

	if err := i.sender.UpdateNotificationSettings(ctx, user.ID.String(), upd); err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to update notification settings")
	}

	return &v1.UpdateNotificationSettingsResponse{}, nil
}
