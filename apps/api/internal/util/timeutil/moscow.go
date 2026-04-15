package timeutil

import (
	"fmt"
	"strings"
	"time"
)

const (
	dateTimeMinuteLayout = "2006-01-02T15:04"
	dateTimeSecondLayout = "2006-01-02T15:04:05"
)

var moscowLocation = loadMoscowLocation()

func loadMoscowLocation() *time.Location {
	location, err := time.LoadLocation("Europe/Moscow")
	if err == nil {
		return location
	}
	return time.FixedZone("MSK", 3*60*60)
}

func MoscowLocation() *time.Location {
	return moscowLocation
}

func NowMoscow() time.Time {
	return time.Now().In(moscowLocation)
}

func NormalizeToUTC(value time.Time) time.Time {
	if value.IsZero() {
		return value
	}
	return value.UTC()
}

func ParseMoscowDateTime(value string) (time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return time.Time{}, fmt.Errorf("empty datetime")
	}

	for _, layout := range []string{time.RFC3339Nano, time.RFC3339} {
		parsed, err := time.Parse(layout, trimmed)
		if err == nil {
			return parsed.UTC(), nil
		}
	}

	for _, layout := range []string{dateTimeSecondLayout, dateTimeMinuteLayout} {
		parsed, err := time.ParseInLocation(layout, trimmed, moscowLocation)
		if err == nil {
			return parsed.UTC(), nil
		}
	}

	return time.Time{}, fmt.Errorf("unsupported datetime format: %q", value)
}
