package util

// IsFullURL checks if the string is already a full URL (http/https).
func IsFullURL(s string) bool {
	return len(s) >= 7 && (s[:7] == "http://" || s[:8] == "https://")
}

// UniqueStrings returns a new slice with duplicate strings removed.
// Preserves order of first occurrence.
func UniqueStrings(items []string) []string {
	if len(items) <= 1 {
		return items
	}

	seen := make(map[string]struct{}, len(items))
	result := make([]string, 0, len(items))

	for _, item := range items {
		if _, ok := seen[item]; !ok {
			seen[item] = struct{}{}
			result = append(result, item)
		}
	}

	return result
}
