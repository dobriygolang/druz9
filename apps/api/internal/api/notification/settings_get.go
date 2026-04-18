package notification

import (
	"context"

	"github.com/go-kratos/kratos/v2/errors"

	"api/internal/apihelpers"
	v1 "api/pkg/api/notification/v1"
)

func (i *SettingsImplementation) GetNotificationSettings(ctx context.Context, _ *v1.GetNotificationSettingsRequest) (*v1.NotificationSettings, error) {
	user, err := apihelpers.RequireUser(ctx)
	if err != nil {
		return nil, err
	}

	settings, err := i.sender.GetNotificationSettings(ctx, user.ID.String())
	if err != nil {
		return nil, errors.InternalServer("INTERNAL", "failed to load notification settings")
	}

	return &v1.NotificationSettings{
		DuelsEnabled:          settings.DuelsEnabled,
		ProgressEnabled:       settings.ProgressEnabled,
		GuildsEnabled:         settings.GuildsEnabled,
		DailyChallengeEnabled: settings.DailyChallengeEnabled,
		QuietHoursStart:       settings.QuietHoursStart,
		QuietHoursEnd:         settings.QuietHoursEnd,
		Timezone:              settings.Timezone,
		TelegramLinked:        settings.TelegramLinked,
	}, nil
}
