package policy

func appendUnique(base []string, values ...string) []string {
	seen := make(map[string]struct{}, len(base))
	out := make([]string, 0, len(base)+len(values))
	for _, item := range base {
		if item == "" {
			continue
		}
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	for _, item := range values {
		if item == "" {
			continue
		}
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	return out
}

func appendUniqueInts(base []int, values ...int) []int {
	seen := make(map[int]struct{}, len(base))
	out := make([]int, 0, len(base)+len(values))
	for _, item := range base {
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	for _, item := range values {
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	return out
}
