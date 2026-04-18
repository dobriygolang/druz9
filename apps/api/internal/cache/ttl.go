package cache

import (
	"time"

	"github.com/hashicorp/golang-lru/v2/expirable"
)

// TTLCache is a cache with TTL and LRU eviction.
type TTLCache[V any] struct {
	cache      *expirable.LRU[string, V]
	defaultTTL time.Duration
}

// NewTTLCache creates a new TTL cache with LRU eviction.
// maxEntries is the maximum number of entries before eviction.
// defaultTTL is the default time-to-live for entries.
func NewTTLCache[V any](maxEntries int, defaultTTL time.Duration) *TTLCache[V] {
	return &TTLCache[V]{
		cache: expirable.NewLRU[string, V](
			maxEntries,
			nil, // no eviction callback
			defaultTTL,
		),
		defaultTTL: defaultTTL,
	}
}

// Get retrieves a value from cache.
func (c *TTLCache[V]) Get(key string) (V, bool) {
	return c.cache.Get(key)
}

// Set stores a value in cache using the default TTL.
func (c *TTLCache[V]) Set(key string, value V) {
	c.cache.Add(key, value)
}

// Delete removes a key from cache.
func (c *TTLCache[V]) Delete(key string) {
	c.cache.Remove(key)
}

// GetMultiple retrieves multiple values from cache in a single call.
// Returns a map of found keys to their values.
func (c *TTLCache[V]) GetMultiple(keys []string) map[string]V {
	result := make(map[string]V, len(keys))
	for _, key := range keys {
		if v, ok := c.cache.Get(key); ok {
			result[key] = v
		}
	}
	return result
}

// Keys returns all keys currently in the cache.
func (c *TTLCache[V]) Keys() []string {
	return c.cache.Keys()
}
