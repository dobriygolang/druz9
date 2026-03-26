package config

import (
	"fmt"
	"os"
	"strings"
)

func ResolveRTCValuesPath() string {
	if explicit := strings.TrimSpace(os.Getenv("RTC_VALUES_PATH")); explicit != "" {
		return explicit
	}

	profile := normalizeConfigProfile(
		firstNonEmpty(
			os.Getenv("CONFIG_PROFILE"),
			os.Getenv("APP_ENV"),
		),
	)

	candidates := []string{
		fmt.Sprintf(".platform/values_%s.yaml", profile),
		fmt.Sprintf(".platform/values.%s.yaml", profile),
		".platform/values.yaml",
	}

	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}

	return candidates[0]
}

func normalizeConfigProfile(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "dev", "development", "local":
		return "local"
	case "prod", "production":
		return "prod"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
