package slices

func Map[T any, R any](s []T, f func(T) R) []R {
	if s == nil {
		return nil
	}
	res := make([]R, len(s))
	for i, v := range s {
		res[i] = f(v)
	}
	return res
}

func Filter[T any](s []T, f func(T) bool) []T {
	if s == nil {
		return nil
	}
	res := make([]T, 0, len(s))
	for _, v := range s {
		if f(v) {
			res = append(res, v)
		}
	}
	return res
}
