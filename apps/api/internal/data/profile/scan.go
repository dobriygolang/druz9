package profile

import (
	"errors"
	"fmt"
	"time"

	profileerrors "api/internal/errors/profile"
	"api/internal/model"

	"github.com/jackc/pgx/v5"
)

func scanUser(scanner userScanner) (*model.User, error) {
	var user model.User
	var username, firstName, lastName, avatarURL, telegramAvatarURL, currentWorkplace, region, country, city *string
	var latitude, longitude *float64
	var telegramID *int64

	if err := scanner.Scan(
		&user.ID, &telegramID, &username, &firstName, &lastName, &avatarURL, &telegramAvatarURL, &currentWorkplace, &region, &country, &city, &latitude, &longitude, &user.Status, &user.IsAdmin, &user.IsTrusted, &user.LastActiveAt, &user.CreatedAt, &user.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, profileerrors.ErrUserNotFound
		}
		return nil, fmt.Errorf("scan user: %w", err)
	}

	fillUserFields(&user, telegramID, username, firstName, lastName, avatarURL, telegramAvatarURL, currentWorkplace, region, country, city, latitude, longitude)
	user.ActivityStatus = model.ResolveActivityStatus(user.LastActiveAt, time.Now().UTC())
	return &user, nil
}

func fillUserFields(user *model.User, telegramID *int64, username, firstName, lastName, avatarURL, telegramAvatarURL, currentWorkplace, region, country, city *string, latitude, longitude *float64) {
	if user == nil {
		return
	}
	if telegramID != nil {
		user.TelegramID = *telegramID
	}
	user.TelegramUsername = valueOrEmpty(username)
	user.FirstName = valueOrEmpty(firstName)
	user.LastName = valueOrEmpty(lastName)
	user.AvatarURL = valueOrEmpty(avatarURL)
	user.TelegramAvatarURL = valueOrEmpty(telegramAvatarURL)
	user.CurrentWorkplace = valueOrEmpty(currentWorkplace)
	user.Region = valueOrEmpty(region)
	user.Geo = scanGeo(region, country, city, latitude, longitude)
}

func scanGeo(region, country, city *string, latitude, longitude *float64) model.UserGeo {
	geo := model.UserGeo{
		Region:  valueOrEmpty(region),
		Country: valueOrEmpty(country),
		City:    valueOrEmpty(city),
	}
	if latitude != nil {
		geo.Latitude = *latitude
	}
	if longitude != nil {
		geo.Longitude = *longitude
	}
	return geo
}

func nullIfEmpty(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
