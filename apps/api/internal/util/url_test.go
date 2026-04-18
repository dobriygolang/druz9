package util

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsFullURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		input    string
		expected bool
	}{
		{"", false},
		{"http://", true},
		{"https://", true},
		{"http://example.com", true},
		{"https://example.com", true},
		{"http://", true},
		{"ftp://example.com", false},
		{"example.com", false},
		{"/path", false},
		{"localhost:8080", false},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			t.Parallel()
			result := IsFullURL(tc.input)
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestIsFullURL_ValidURLs(t *testing.T) {
	t.Parallel()

	// Test valid URLs with sufficient length
	assert.True(t, IsFullURL("http://a"))  // http://a = 8 chars
	assert.True(t, IsFullURL("https://a")) // https://a = 9 chars
}

func TestUniqueStrings(t *testing.T) {
	t.Parallel()

	t.Run("nil slice", func(t *testing.T) {
		t.Parallel()
		result := UniqueStrings(nil)
		assert.Nil(t, result)
	})

	t.Run("empty slice", func(t *testing.T) {
		t.Parallel()
		result := UniqueStrings([]string{})
		assert.Empty(t, result)
	})

	t.Run("single element", func(t *testing.T) {
		t.Parallel()
		result := UniqueStrings([]string{"a"})
		assert.Equal(t, []string{"a"}, result)
	})

	t.Run("no duplicates", func(t *testing.T) {
		t.Parallel()
		result := UniqueStrings([]string{"a", "b", "c"})
		assert.Equal(t, []string{"a", "b", "c"}, result)
	})

	t.Run("with duplicates", func(t *testing.T) {
		t.Parallel()
		result := UniqueStrings([]string{"a", "b", "a", "c", "b"})
		assert.Equal(t, []string{"a", "b", "c"}, result)
	})

	t.Run("all duplicates", func(t *testing.T) {
		t.Parallel()
		result := UniqueStrings([]string{"a", "a", "a"})
		assert.Equal(t, []string{"a"}, result)
	})

	t.Run("preserves order", func(t *testing.T) {
		t.Parallel()
		result := UniqueStrings([]string{"z", "a", "m", "a", "z"})
		assert.Equal(t, []string{"z", "a", "m"}, result)
	})
}
