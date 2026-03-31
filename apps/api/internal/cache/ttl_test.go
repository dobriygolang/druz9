package cache

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewTTLCache_CreatesCache(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)
	assert.NotNil(t, cache)
}

func TestTTLCache_Get_MissingKey(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)

	_, found := cache.Get("nonexistent")
	assert.False(t, found, "should return false for missing key")
}

func TestTTLCache_SetAndGet(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)

	cache.Set("key1", "value1", 0)
	value, found := cache.Get("key1")

	assert.True(t, found, "should find the key")
	assert.Equal(t, "value1", value)
}

func TestTTLCache_SetWithCustomTTL(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)

	cache.Set("key1", "value1", time.Hour)
	value, found := cache.Get("key1")

	assert.True(t, found)
	assert.Equal(t, "value1", value)
}

func TestTTLCache_SetOverwritesExisting(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)

	cache.Set("key1", "value1", 0)
	cache.Set("key1", "value2", 0)
	value, found := cache.Get("key1")

	assert.True(t, found)
	assert.Equal(t, "value2", value)
}

func TestTTLCache_Delete(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)

	cache.Set("key1", "value1", 0)
	cache.Delete("key1")
	_, found := cache.Get("key1")

	assert.False(t, found, "key should be deleted")
}

func TestTTLCache_GetMultiple_Empty(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)

	result := cache.GetMultiple([]string{})
	assert.Empty(t, result)
}

func TestTTLCache_GetMultiple_SomeKeys(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)
	cache.Set("key1", "value1", 0)
	cache.Set("key2", "value2", 0)

	result := cache.GetMultiple([]string{"key1", "key2", "missing"})

	assert.Len(t, result, 2)
	assert.Equal(t, "value1", result["key1"])
	assert.Equal(t, "value2", result["key2"])
}

func TestTTLCache_SetMultiple(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)

	values := map[string]string{
		"key1": "value1",
		"key2": "value2",
	}
	cache.SetMultiple(values, 0)

	v1, found1 := cache.Get("key1")
	v2, found2 := cache.Get("key2")

	assert.True(t, found1)
	assert.True(t, found2)
	assert.Equal(t, "value1", v1)
	assert.Equal(t, "value2", v2)
}

func TestTTLCache_SetMultipleWithCustomTTL(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)

	values := map[string]string{
		"key1": "value1",
	}
	cache.SetMultiple(values, time.Hour)

	v, found := cache.Get("key1")
	assert.True(t, found)
	assert.Equal(t, "value1", v)
}

func TestTTLCache_DefaultTTLUsed(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)

	cache.Set("key1", "value1", 0) // zero TTL should use default

	v, found := cache.Get("key1")
	assert.True(t, found)
	assert.Equal(t, "value1", v)
}

func TestTTLCache_SetMultipleWithZeroTTL(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)

	cache.SetMultiple(map[string]string{"key1": "value1"}, 0) // zero TTL should use default

	v, found := cache.Get("key1")
	assert.True(t, found)
	assert.Equal(t, "value1", v)
}

func TestTTLCache_GetMultiple_AllMissing(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](10, time.Minute)

	result := cache.GetMultiple([]string{"missing1", "missing2"})

	assert.Empty(t, result)
}

func TestTTLCache_LRUEviction(t *testing.T) {
	t.Parallel()

	cache := NewTTLCache[string](3, time.Minute)

	cache.Set("key1", "value1", 0)
	cache.Set("key2", "value2", 0)
	cache.Set("key3", "value3", 0)
	cache.Set("key4", "value4", 0) // should evict key1

	_, found1 := cache.Get("key1")
	_, found2 := cache.Get("key2")
	_, found3 := cache.Get("key3")
	_, found4 := cache.Get("key4")

	assert.False(t, found1, "key1 should be evicted")
	assert.True(t, found2)
	assert.True(t, found3)
	assert.True(t, found4)
}