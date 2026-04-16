package profile

import "strings"

func normalizeAvatarURL(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}
	if strings.HasPrefix(value, "//") {
		return "https:" + value
	}
	if strings.HasPrefix(value, "http://") {
		return "https://" + strings.TrimPrefix(value, "http://")
	}
	return value
}
