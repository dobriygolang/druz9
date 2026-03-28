package slices

// Map applies function f to each element of slice s and returns a new slice containing the results.
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

// Filter applies function f to each element of slice s and returns a new slice containing only elements that satisfy f.
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

// Reduce applies function f to each element of slice s and the current accumulator value, returning the final accumulated value.
func Reduce[T any, R any](s []T, acc R, f func(R, T) R) R {
	for _, v := range s {
		acc = f(acc, v)
	}
	return acc
}

// FindFirst returns the first element in the slice that satisfies f and true.
// If no element satisfies f, it returns the zero value of T and false.
func FindFirst[T any](s []T, f func(T) bool) (T, bool) {
	for _, v := range s {
		if f(v) {
			return v, true
		}
	}
	var zero T
	return zero, false
}

// GroupBy groups elements of s by the key returned by keyFn.
func GroupBy[K comparable, V any](s []V, keyFn func(V) K) map[K][]V {
	m := make(map[K][]V, len(s))
	for _, v := range s {
		k := keyFn(v)
		m[k] = append(m[k], v)
	}
	return m
}

// Keys returns all keys of map m as a slice (order is non-deterministic).
func Keys[K comparable, V any](m map[K]V) []K {
	keys := make([]K, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// Values returns all values of map m as a slice (order is non-deterministic).
func Values[K comparable, V any](m map[K]V) []V {
	vals := make([]V, 0, len(m))
	for _, v := range m {
		vals = append(vals, v)
	}
	return vals
}

// Unique returns a new slice with duplicate elements removed, preserving order of first occurrence.
func Unique[T comparable](s []T) []T {
	seen := make(map[T]struct{}, len(s))
	res := make([]T, 0, len(s))
	for _, v := range s {
		if _, ok := seen[v]; !ok {
			seen[v] = struct{}{}
			res = append(res, v)
		}
	}
	return res
}

// Contains reports whether v is present in s.
// Uses O(n) linear search - for frequent lookups, consider using a map instead.
func Contains[T comparable](s []T, v T) bool {
	for _, elem := range s {
		if elem == v {
			return true
		}
	}
	return false
}

// ContainsSet reports whether v is present in set.
// Uses O(1) lookup - preferred for frequent lookups with pre-built set.
func ContainsSet[T comparable](set map[T]struct{}, v T) bool {
	_, ok := set[v]
	return ok
}

// NewSet creates a set from slice for O(1) lookups.
func NewSet[T comparable](s []T) map[T]struct{} {
	set := make(map[T]struct{}, len(s))
	for _, v := range s {
		set[v] = struct{}{}
	}
	return set
}
