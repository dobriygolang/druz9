package slices

import (
	"testing"
)

func BenchmarkContains(b *testing.B) {
	s := []string{"a", "b", "c", "d", "e", "f", "g", "h", "i", "j"}

	b.Run("linear search", func(b *testing.B) {
		b.ReportAllocs()
		for range b.N {
			_ = Contains(s, "j")
		}
	})

	b.Run("set lookup", func(b *testing.B) {
		set := NewSet(s)
		b.ReportAllocs()
		for range b.N {
			_ = ContainsSet(set, "j")
		}
	})
}

func BenchmarkUnique(b *testing.B) {
	s := []string{"a", "b", "c", "a", "d", "e", "b", "f", "g", "h"}

	b.Run("unique", func(b *testing.B) {
		b.ReportAllocs()
		for range b.N {
			_ = Unique(s)
		}
	})
}

func BenchmarkMap(b *testing.B) {
	s := []string{"a", "b", "c", "d", "e", "f", "g", "h", "i", "j"}

	b.Run("map strings", func(b *testing.B) {
		b.ReportAllocs()
		for range b.N {
			_ = Map(s, func(s string) string { return s + "_" })
		}
	})

	b.Run("map to bool", func(b *testing.B) {
		b.ReportAllocs()
		for range b.N {
			_ = Map(s, func(s string) bool { return s != "" })
		}
	})
}

func BenchmarkFilter(b *testing.B) {
	s := []string{"a", "bb", "ccc", "dddd", "eeeee", "f", "gg", "hhh", "iiii", "jjjjj"}

	b.Run("filter", func(b *testing.B) {
		b.ReportAllocs()
		for range b.N {
			_ = Filter(s, func(s string) bool { return len(s) > 2 })
		}
	})
}

// go test -bench=. -benchmem ./internal/tools/slices/
